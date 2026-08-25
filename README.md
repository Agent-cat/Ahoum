# Sessions Marketplace

A compact sessions marketplace where users browse and book sessions, and creators manage their own. Built with Next.js, Django, PostgreSQL, and Docker.

## What it does

- **Landing page** at `/` — just a clean hero with a "Browse Sessions" call to action
- **Sessions page** at `/sessions` — card grid of all available sessions. Shows "Booked" if you already registered, "Fully Booked" if full, or "View & Book" otherwise
- **Session detail** at `/sessions/[id]` — full info with a "Book Now" button that pops a confirmation dialog, then toasts success
- **My Bookings** at `/bookings` — your upcoming and past sessions, with a "Cancel Booking" option (confirmation + toast)
- **Creator Dashboard** at `/creator` — create, edit, delete your sessions. Becomes available once you switch to creator role
- **Profile** at `/profile` — update your display name
- **Sign in** at `/login` — GitHub OAuth, Google OAuth, or dev login (if enabled)

### Available roles

| Role | What they can do |
|------|-----------------|
| **User** | Browse sessions, book sessions, view/cancel bookings, edit profile |
| **Creator** | Everything a user can do, PLUS create/edit/delete sessions, view booking counts on their sessions |

Any user can promote themselves to creator from the Creator dashboard. You can't switch back to user if you still own sessions.

## Getting started

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost/

### Setting up OAuth

**GitHub:**
1. Go to https://github.com/settings/developers
2. Create a new OAuth app
3. Homepage URL: `http://localhost/`
4. Authorization callback: `http://localhost/auth/callback`
5. Put the Client ID and Client Secret in `.env`

**Google:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `http://localhost/auth/google/callback`
4. Put the Client ID and Client Secret in `.env`

Or just use dev login — set `DEV_LOGIN_ENABLED=1` in `.env` and you can sign in with any username.

### Running tests

```bash
docker compose exec backend uv run python manage.py test catalog

# Race condition test (12 concurrent bookings on a 3-seat session)
docker compose exec backend uv run python scripts/race_check.py http://localhost:8000/api
```

## Architecture

```
browser → nginx → /api/* → Django (gunicorn :8000) → PostgreSQL
                    /*   → Next.js (:3000)
```

Four Docker services: `db` (Postgres), `backend` (Django), `frontend` (Next.js), `nginx` (reverse proxy).

### How booking works

When you click "Book Now", the backend:
1. Locks the session row (`SELECT FOR UPDATE`)
2. Checks the session hasn't started yet
3. Tries to insert a booking (unique constraint on `session + user` prevents double-booking)
4. Verifies total bookings don't exceed capacity
5. Returns success

This is safe even with 12 people clicking at the same time on the last seat.

## API endpoints

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/auth/github/url/` | public |
| POST | `/api/auth/github/` | public |
| GET | `/api/auth/google/url/` | public |
| POST | `/api/auth/google/` | public |
| POST | `/api/auth/dev-login/` | public (dev only) |
| POST | `/api/auth/refresh/` | public |
| GET/PATCH | `/api/me/` | authenticated |
| GET | `/api/sessions/` | public |
| POST | `/api/sessions/` | creator |
| PATCH/DELETE | `/api/sessions/{id}/` | owning creator |
| POST | `/api/sessions/{id}/book/` | authenticated |
| POST | `/api/sessions/{id}/unregister/` | authenticated |
| GET | `/api/my/sessions/` | creator |
| GET | `/api/bookings/` | authenticated |

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, sonner (toasts) |
| Backend | Django 5, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 16 |
| Auth | GitHub OAuth + Google OAuth + dev login → JWT pair |
| Infra | Docker Compose with nginx reverse proxy |

## Known limitations

- JWTs in localStorage (XSS-exposed, should be httpOnly cookies for production)
- No pagination on list endpoints
- No email verification or password reset
- OAuth state is signed but not stored server-side
- No CI pipeline — tests run through Docker
- Creators can't lower capacity below existing bookings

## What I'd do with more time

1. httpOnly cookie token delivery + CSRF
2. Waitlists for full sessions
3. Search and filtering on the catalog
4. GitHub Actions CI
5. Playwright end-to-end tests
6. Rate limiting on auth endpoints
