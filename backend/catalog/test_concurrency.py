"""
Concurrency correctness test.

Runs N threads that all try to book the same session at the same moment.
The final number of bookings must never exceed capacity, and no user may
end up with two bookings for the same session.

Requires a real PostgreSQL database (select_for_update row locks).
Run inside Docker:  docker compose exec backend uv run python manage.py test catalog
"""

import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Booking, Session

# Sorts last alphabetically so TransactionTestCase table truncation cannot
# interfere with plain TestCase tests in this app.
USERS = 12
CAPACITY = 3


class ZConcurrentBookingTests(TransactionTestCase):
    serialized_rollback = False

    def _run_race(self):
        creator = User.objects.create(username="race-creator", role="creator")
        users = [
            User.objects.create(username=f"race-user-{i}", role="user") for i in range(USERS)
        ]
        session = Session.objects.create(
            creator=creator,
            title="Race",
            starts_at=timezone.now() + timedelta(days=1),
            capacity=CAPACITY,
        )

        barrier = threading.Barrier(USERS)
        results = {}

        def attempt(i):
            user = users[i]
            # `connection` is thread-local, so each thread uses its own DB
            # connection; close it when done to avoid leaking connections.
            client = APIClient()
            client.force_authenticate(user=user)
            barrier.wait()
            resp = client.post(f"/api/sessions/{session.id}/book/")
            connection.close()
            return i, resp.status_code

        with ThreadPoolExecutor(max_workers=USERS) as pool:
            futures = [pool.submit(attempt, i) for i in range(USERS)]
            for f in futures:
                i, code = f.result()
                results[i] = code

        return results

    def test_parallel_bookings_never_exceed_capacity(self):
        results = self._run_race()

        succeeded = sum(1 for c in results.values() if c == 201)
        rejected = sum(1 for c in results.values() if c == 409)

        self.assertEqual(
            succeeded + rejected,
            USERS,
            f"unexpected statuses: {results}",
        )
        self.assertEqual(succeeded, CAPACITY)
        self.assertEqual(Booking.objects.count(), CAPACITY)

    def test_no_user_holds_two_bookings_for_same_session(self):
        self._run_race()
        from django.db.models import Count

        dupes = (
            Booking.objects.values("user_id", "session_id")
            .annotate(n=Count("id"))
            .filter(n__gt=1)
        )
        self.assertEqual(list(dupes), [])
