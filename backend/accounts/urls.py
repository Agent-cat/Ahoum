from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("auth/github/url/", views.github_authorize_url),
    path("auth/github/", views.github_callback),
    path("auth/google/url/", views.google_authorize_url),
    path("auth/google/", views.google_callback),
    path("auth/dev-login/", views.dev_login),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("me/", views.me),
]
