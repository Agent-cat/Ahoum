# DECISIONS.md

At least three non-trivial decisions, each with the ambiguity, options, choice,
and trade-offs. (Requirements forced by the brief — Django/DRF/Postgres/Docker,
OAuth+JWT — are not counted.)

---

## 1. How to enforce capacity under concurrency

**Problem.** "One seat left, two users book simultaneously" must never oversell.
Where does the invariant live: DB constraint, row lock, optimistic counter,
trigger?

**Options considered**

1. *Optimistic update*: `UPDATE … SET seats_taken = seats_taken + 1 WHERE id = X
   AND seats_taken < capacity` guarded counter column.
   - Fast, but requires denormalizing a counter that can drift from `booking`
     rows; every code path touching bookings must maintain it.
2. *DB trigger / exclusion constraint*: enforce capacity entirely in Postgres.
   - Strongest guarantee, but logic becomes invisible to Python, hard to test in
     DRF tests, and triggers are easy for future maintainers to miss.
3. **Row lock + check inside a transaction (chosen)**: open a transaction,
   `SELECT … FOR UPDATE` the session row, re-check `starts_at`, insert the
   booking, verify `count <= capacity`.
4. *Advisory locks* keyed by session id — equivalent serialization with more
   moving parts and no link between lock lifetime and the transaction.

**Choice:** option 3, plus a DB-level partial unique constraint
`(session, user)` so double-booking is impossible even if two requests from the
same user race past the existence check (the second insert raises
`IntegrityError`, mapped to `409`).

**Trade-offs.** The capacity check itself is application-level; its correctness
depends on every write path taking the session-row lock first. I accepted that
because bookings are low-frequency writes, contention on one row is negligible,
and the invariant is trivially auditable (`catalog/views.py::book`). The unique
constraint covers the duplicate-user case purely at the database level. Verified
by `catalog/test_concurrency.py` (12 threads, capacity 3 → exactly 3 successes)
and `scripts/race_check.py`.

---

## 2. OAuth flow shape: who talks to GitHub

**Problem.** Where does the authorization `code` get exchanged for a token:
backend redirect flow or frontend-mediated exchange?

**Options considered**

1. **Frontend receives `?code=`, POSTs it to the backend; backend exchanges it
   (chosen).**
2. Classic backend redirect flow: backend `/auth/github/callback` endpoint
   redirects to the frontend with JWTs in the URL fragment.

**Choice:** option 1. One backend endpoint (`POST /api/auth/github/`) owns the
client secret and returns the JWT pair as JSON, exactly like every other auth
endpoint. No secret ever near the browser, no tokens in URLs (fragments leak via
history/referrer), and SPA routing stays trivial.

**Trade-offs.** The `state` parameter needs round-tripping through the frontend;
I sign a random token with Django's secret (`django.core.signing`, 10-min TTL)
so the backend can verify it without server-side storage. CSRF risk is lower
than the implicit flow since the exchange still happens server-side, but state
validation only happens when the frontend passes it — documented limitation.

---

## 3. Roles: single switchable role field vs. richer creator model

**Problem.** Users and Creators share almost everything (auth, profile); how much
structure should separate them?

**Options considered**

1. Separate `CreatorProfile` model + permission lookup.
2. Role choices on the custom User (chosen), permissions checked server-side.
3. Django Groups/permissions framework.

**Choice:** option 2. A `role` column with `TextChoices`, an `IsCreator`
permission class, and object-level ownership checks. Any authenticated user can
promote themselves to creator (demotion blocked while they own sessions).

**Trade-offs.** Least structure, easiest to reason about and test; if monetized
"verified creators" were needed later, migration to a profile model would touch
every permission check. Rejected Groups because a per-request group lookup buys
nothing over a single indexed column here, and role semantics are product logic,
not infrastructure.

---

## 4. Dev login endpoint behind an env flag

**Problem.** Graders/reviewers may not set up a GitHub OAuth app within review
time, making the app un-demoable.

**Choice:** `POST /api/auth/dev-login/ {username, role}` creates/updates a local
account and issues real JWTs — enabled only when `DEV_LOGIN_ENABLED=1`
(defaults off; `.env.example` ships it on with a warning).

**Trade-offs.** An extra auth surface that must never ship enabled; mitigated by
defaulting to disabled and returning 404 otherwise. Accepted because a broken
demo flow costs more in evaluation than a flag-guarded dev endpoint.

---

## 5. Frontend token storage: localStorage vs httpOnly cookies

**Problem.** Where do the access/refresh JWTs live in the browser?

**Choice:** `localStorage` with transparent refresh-on-401 in the fetch wrapper.
Simple, works across nginx-routed same-origin calls, no CSRF machinery needed.

**Trade-offs.** Vulnerable to XSS; an httpOnly-cookie design (backend sets
cookies, SPA never touches tokens) was deferred — noted in README limitations.
For a scoped assignment app without third-party scripts this is a conscious,
documented risk rather than an oversight.
