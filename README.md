# Ahoum — Sessions Marketplace

A compact sessions marketplace: users authenticate with GitHub OAuth (JWTs issued by
the backend), browse sessions, and book them; creators create and manage their own
sessions. Booking is capacity-safe under concurrent access.

## Stack

| Layer     | Tech                                                        |
|-----------|-------------------------------------------------------------|
| Frontend  | Next.js 16 (App Router, client-side pages), TypeScript      |
| Backend   | Django 5 + Django REST Framework, SimpleJWT                 |
| Database  | PostgreSQL 16                                               |
| Auth      | GitHub OAuth (code exchange on the backend) -> JWT pair     |
| Infra     | Docker Compose: `db`, `backend`, `frontend`, `nginx`        |

## Quick start

```bash
cp .env.example .env          # adjust values if you like
docker compose up --build
```

Then open **http://localhost/**

- The catalog (`/`) works without an account.
- Sign in at `/login`:
  - **Continue with GitHub** — requires `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
    in `.env`. Create an OAuth app at https://github.com/settings/developers with
    callback URL `http://localhost/auth/callback`.
  - **Development login** — enabled when `DEV_LOGIN_ENABLED=1`; lets you create
    `user` or `creator` accounts without GitHub credentials.

### Run the tests

```bash
# full suite incl. authorization/error cases (needs Postgres, so run in Docker)
docker compose exec backend uv run python manage.py test catalog

# standalone race-condition script against the running stack
docker compose exec backend uv run python scripts/race_check.py http://localhost:8000/api
```

Expected race output: 12 simultaneous booking attempts on a 3-seat session end with
exactly `3 × 201` and `9 × 409`.

## Architecture

```
browser ──> nginx ──┬── /api/*  ──> Django (gunicorn :8000) ──> PostgreSQL
                    └── /*      ──> Next.js (:3000)
```

- **Backend** (`backend/`, managed with [uv](https://docs.astral.sh/uv/)):
  - `accounts` — custom `User` model (`role`: `user|creator`), GitHub OAuth code
    exchange, JWT issuance/refresh, profile endpoint `/api/me/`.
  - `catalog` — `Session` and `Booking` models, public catalog/detail,
    creator-only CRUD scoped to the owner, booking endpoint with concurrency-safe
    capacity enforcement, `/api/my/sessions/` (with booking counts),
    `/api/bookings/` (upcoming/past).
- **Frontend** (`frontend/`): client-side React pages — catalog, session detail +
  booking, my bookings, creator dashboard, profile, OAuth callback. The SPA keeps
  JWTs in `localStorage` and transparently refreshes expired access tokens.
- **nginx**: single entry point; routes `/api` (and `/admin`) to Django, everything
  else to Next.js.

### Key endpoints

| Method | Path                     | Access                        |
|--------|--------------------------|-------------------------------|
| POST   | `/api/auth/github/`      | public (OAuth code exchange)  |
| POST   | `/api/auth/refresh/`     | public (refresh token)        |
| GET/PATCH | `/api/me/`            | authenticated                 |
| GET    | `/api/sessions/`         | public                        |
| POST   | `/api/sessions/`         | creator only                  |
| PATCH/DELETE | `/api/sessions/{id}/` | owning creator only       |
| POST   | `/api/sessions/{id}/book/` | authenticated non-owner   |
| GET    | `/api/my/sessions/`      | creator only                  |
| GET    | `/api/bookings/`         | authenticated                 |

### How booking stays correct

All inserts into `booking` serialize on a `SELECT … FOR UPDATE` row lock of the
session row, then check `bookings.count() < capacity` before inserting. A partial
unique constraint `(session, user)` makes double-booking impossible at the database
level even if application logic were bypassed. Bookings for started sessions are
rejected. Details and rationale: `DECISIONS.md`.

## Data persistence

PostgreSQL data lives in the named volume `pgdata` (`/var/lib/postgresql/data`
inside the `db` container). Recreating/upgrading/restarting app containers never
touches it:

```bash
docker compose down            # stops containers, volume survives
docker compose up -d           # data is still there
docker compose down -v         # ONLY this deletes data
```

Migrations run automatically on backend startup (`manage.py migrate` before gunicorn).

## Project layout

```
backend/    Django project (uv-managed): config/, accounts/, catalog/, scripts/
frontend/   Next.js app (app router)
nginx/      reverse proxy config
.env.example
PROMPT_LOG.md  DECISIONS.md  DEBUGGING.md
```

## Known limitations

- JWTs are stored in `localStorage` (XSS-exposed); httpOnly cookies would be safer.
- No pagination on list endpoints.
- Creators can't cancel/edit capacity below current bookings (API rejects capacity
  edits only implicitly — lowering capacity below bookings isn't blocked).
- No email verification / password flows (OAuth + dev login only).
- OAuth state uses a signed token rather than server-side session storage.
- No CI pipeline; tests must be run through Docker.

## With one more day

1. httpOnly-cookie token delivery + CSRF handling.
2. Booking cancellation and waitlists; capacity-decrease validation.
3. Pagination + filtering (search by title, upcoming-only toggle) on the catalog.
4. CI (GitHub Actions) running the Django suite against a Postgres service.
5. End-to-end browser test (Playwright) covering OAuth mock and booking flow.
6. Rate limiting on auth endpoints.
