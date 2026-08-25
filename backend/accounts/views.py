import secrets
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core import signing
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as _TokenRefreshView

from .models import User
from .serializers import DevLoginSerializer, GitHubCodeSerializer, GoogleCodeSerializer, UserSerializer

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API = "https://api.github.com/user"

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

STATE_SALT = "accounts.oauth.state"


class OAuthError(Exception):
    pass


def _make_state():
    raw = secrets.token_urlsafe(24)
    signed = signing.dumps(raw, salt=STATE_SALT)
    return raw, signed


def _verify_state(signed_state):
    try:
        signing.loads(signed_state, salt=STATE_SALT, max_age=600)
    except (signing.BadSignature, signing.SignatureExpired):
        return False
    return True


@api_view(["GET"])
@permission_classes([AllowAny])
def github_authorize_url(request):
    if not settings.GITHUB_CLIENT_ID:
        return Response(
            {"detail": "GitHub OAuth is not configured on this server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    raw, signed = _make_state()
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "scope": "read:user user:email",
        "state": signed,
        "redirect_uri": request.build_absolute_uri("/oauth/callback").replace("http://", "http://")
        if False else None,
    }
    params.pop("redirect_uri")  # rely on the OAuth app's configured callback URL
    return Response({"authorize_url": f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"})


@api_view(["POST"])
@permission_classes([AllowAny])
def github_callback(request):
    serializer = GitHubCodeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code = serializer.validated_data["code"]
    state = serializer.validated_data.get("state")

    if state and not _verify_state(state):
        return Response({"detail": "Invalid or expired OAuth state."}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.GITHUB_CLIENT_ID:
        return Response(
            {"detail": "GitHub OAuth is not configured on this server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        token_resp = requests.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        access_token = token_resp.json().get("access_token")
        if not access_token:
            return Response(
                {"detail": "GitHub rejected the authorization code.", "error": token_resp.json().get("error")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
        gh_user = requests.get(GITHUB_USER_API, headers=headers, timeout=10).json()
        email = gh_user.get("email")
        if email is None:
            emails = requests.get(f"{GITHUB_USER_API}/emails", headers=headers, timeout=10).json()
            primary = next((e for e in emails if e.get("primary")), None)
            email = primary["email"] if primary else None
    except (requests.RequestException, ValueError) as exc:
        return Response(
            {"detail": "Could not reach GitHub to complete sign-in.", "error": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    github_id = gh_user.get("id")
    if not github_id:
        return Response({"detail": "GitHub did not return a user profile."}, status=status.HTTP_502_BAD_GATEWAY)

    with transaction.atomic():
        user, created = User.objects.get_or_create(
            github_id=github_id,
            defaults={"username": gh_user["login"], "email": email or ""},
        )
        if created:
            user.display_name = gh_user.get("name") or gh_user["login"]
        # keep username/email in sync with the provider
        user.email = email or user.email
        user.avatar_url = gh_user.get("avatar_url") or ""
        user.save()

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def dev_login(request):
    """Local-development login so the app works without GitHub credentials.

    Only enabled when DEV_LOGIN_ENABLED=1; never used in production.
    """
    if not settings.DEV_LOGIN_ENABLED:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = DevLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    username = serializer.validated_data["username"]
    role = serializer.validated_data["role"]

    with transaction.atomic():
        user, created = User.objects.get_or_create(username=username, defaults={})
        if created:
            user.set_unusable_password()
            user.display_name = username
        user.role = role
        user.save()

    refresh = RefreshToken.for_user(user)
    return Response(
        {"access": str(refresh.access_token), "refresh": str(refresh), "user": UserSerializer(user).data}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def google_authorize_url(request):
    if not settings.GOOGLE_CLIENT_ID:
        return Response(
            {"detail": "Google OAuth is not configured on this server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    raw, signed = _make_state()
    redirect_uri = request.build_absolute_uri("/auth/google/callback")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": signed,
        "access_type": "offline",
        "prompt": "consent",
    }
    return Response({"authorize_url": f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}"})


@api_view(["POST"])
@permission_classes([AllowAny])
def google_callback(request):
    serializer = GoogleCodeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code = serializer.validated_data["code"]
    state = serializer.validated_data.get("state")

    if state and not _verify_state(state):
        return Response({"detail": "Invalid or expired OAuth state."}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.GOOGLE_CLIENT_ID:
        return Response(
            {"detail": "Google OAuth is not configured on this server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    redirect_uri = request.build_absolute_uri("/auth/google/callback")

    try:
        token_resp = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return Response(
                {"detail": "Google rejected the authorization code.", "error": token_data.get("error")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_info = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        ).json()

        google_id = user_info.get("sub")
        email = user_info.get("email", "")
        name = user_info.get("name", "")
        picture = user_info.get("picture", "")

    except (requests.RequestException, ValueError) as exc:
        return Response(
            {"detail": "Could not reach Google to complete sign-in.", "error": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if not google_id:
        return Response({"detail": "Google did not return a user profile."}, status=status.HTTP_502_BAD_GATEWAY)

    with transaction.atomic():
        user, created = User.objects.get_or_create(
            google_id=google_id,
            defaults={"username": email.split("@")[0] if email else f"google_{google_id}", "email": email},
        )
        if created:
            user.display_name = name or user.username
        user.email = email or user.email
        user.avatar_url = picture or user.avatar_url
        user.save()

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }
    )


token_refresh = _TokenRefreshView.as_view()


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    serializer = UserSerializer(request.user)
    if request.method == "GET":
        return Response(serializer.data)

    data = request.data.copy()
    new_role = data.get("role")
    if new_role is not None:
        if new_role not in User.Roles.values:
            return Response({"role": ["Role must be 'user' or 'creator'."]}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == User.Roles.CREATOR and new_role == User.Roles.USER:
            if request.user.sessions.exists():
                return Response(
                    {"role": ["You still own sessions; delete them before switching back to a user."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
    serializer = UserSerializer(request.user, data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
