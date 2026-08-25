"""
Reproducible race-condition check against a RUNNING stack (docker compose up).

Creates one session with capacity 3, then fires 12 simultaneous authenticated
booking requests and asserts that exactly 3 succeeded.

Usage:
    docker compose exec backend uv run python scripts/race_check.py
    (or against any host:) python scripts/race_check.py http://localhost/api
"""

import sys
import threading
from concurrent.futures import ThreadPoolExecutor

import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost/api"
USERS = 12
CAPACITY = 3


def login(username):
    r = requests.post(
        f"{BASE}/auth/dev-login/",
        json={"username": username, "role": "user"},
        timeout=10,
    )
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access']}"}


def main():
    creator_headers = requests.post(
        f"{BASE}/auth/dev-login/",
        json={"username": "race-creator", "role": "creator"},
        timeout=10,
    ).json()["access"]
    creator_headers = {"Authorization": f"Bearer {creator_headers}"}

    session = requests.post(
        f"{BASE}/sessions/",
        headers=creator_headers,
        json={
            "title": "Race demo",
            "description": "",
            # start far in the future; server treats naive ISO as UTC? we send Z
            "starts_at": "2099-01-01T00:00:00Z",
            "capacity": CAPACITY,
        },
        timeout=10,
    )
    session.raise_for_status()
    session_id = session.json()["id"]

    user_headers = [login(f"race-{i}") for i in range(USERS)]
    barrier = threading.Barrier(USERS)
    results = {}

    def attempt(i):
        barrier.wait()
        resp = requests.post(
            f"{BASE}/sessions/{session_id}/book/", headers=user_headers[i], timeout=10
        )
        return i, resp.status_code, resp.text[:80]

    with ThreadPoolExecutor(max_workers=USERS) as pool:
        for i, code, body in pool.map(attempt, range(USERS)):
            results[i] = code

    ok = sum(1 for c in results.values() if c == 201)
    print("statuses:", sorted(results.values()))
    print(f"succeeded={ok} capacity={CAPACITY}")

    detail = requests.get(f"{BASE}/sessions/{session_id}/", timeout=10).json()
    final_bookings = detail["capacity"] - detail["seats_left"]
    print(f"bookings recorded by API: {final_bookings}")

    assert ok == CAPACITY, f"OVERBOOKING or wrong outcome: {results}"
    assert final_bookings == CAPACITY, "API state inconsistent"
    print("PASS: capacity respected under concurrency")


if __name__ == "__main__":
    main()
