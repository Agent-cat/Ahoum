"""
Authorization / error-case tests:
1. Invalid or expired access token -> 401 with a proper API error.
2. A plain user cannot call creator-only endpoints.
3. A creator cannot edit another creator's session.
4. Booking a session that already started is rejected.
5. Double-booking the same session by one user is rejected.
"""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Session


def make_user(username, role):
    return User.objects.create(username=username, role=role, display_name=username)


class AuthErrorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.creator = make_user("creator1", "creator")
        self.user = make_user("user1", "user")
        self.session = Session.objects.create(
            creator=self.creator,
            title="Test",
            description="",
            starts_at="2099-01-01T10:00:00Z",
            capacity=5,
        )

    def test_invalid_access_token_gets_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        resp = self.client.get("/api/me/")
        self.assertEqual(resp.status_code, 401)
        # simplejwt returns {"detail": "..."} — must be a JSON error, not HTML/500
        self.assertIn("detail", resp.json())
        self.assertIn("code", resp.json())

    def test_missing_token_gets_401(self):
        resp = self.client.get("/api/me/")
        self.assertEqual(resp.status_code, 401)

    def test_user_cannot_create_session(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/sessions/",
            {"title": "X", "description": "", "starts_at": "2099-01-01T10:00:00Z", "capacity": 3},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_user_cannot_list_creator_sessions(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/api/my/sessions/")
        self.assertEqual(resp.status_code, 403)

    def test_creator_cannot_edit_another_creators_session(self):
        other = make_user("creator2", "creator")
        self.client.force_authenticate(user=other)
        resp = self.client.patch(
            f"/api/sessions/{self.session.id}/",
            {"title": "hijacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_creator_cannot_delete_another_creators_session(self):
        other = make_user("creator2", "creator")
        self.client.force_authenticate(user=other)
        resp = self.client.delete(f"/api/sessions/{self.session.id}/")
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(Session.objects.filter(pk=self.session.pk).exists())


class BookingRuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.creator = make_user("creator1", "creator")
        self.user = make_user("user1", "user")

    def test_cannot_book_started_session(self):
        past = Session.objects.create(
            creator=self.creator,
            title="Past",
            starts_at=timezone.now() - timedelta(hours=1),
            capacity=2,
        )
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(f"/api/sessions/{past.id}/book/")
        self.assertEqual(resp.status_code, 400)

    def test_double_booking_rejected(self):
        future = Session.objects.create(
            creator=self.creator,
            title="Future",
            starts_at=timezone.now() + timedelta(days=1),
            capacity=2,
        )
        self.client.force_authenticate(user=self.user)
        first = self.client.post(f"/api/sessions/{future.id}/book/")
        second = self.client.post(f"/api/sessions/{future.id}/book/")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(future.bookings.count(), 1)
