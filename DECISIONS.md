# DECISIONS.md

Engineering decisions that shaped this project. Not just "what" but "why" and "what else we considered."

---

## 1. How to handle concurrent bookings

**The problem:** Two people click "Book Now" on the same session at the same time. Only one should get through. The session has a capacity, and we can't oversell it.

**Options we looked at:**

1. **Optimistic update** — `UPDATE seats_taken + 1 WHERE seats_taken < capacity`. Fast, but the counter can drift from actual booking rows. Every code path touching bookings has to maintain it correctly.
2. **Database trigger** — enforce capacity entirely in Postgres. Strongest guarantee, but the logic is hidden from Python, hard to test in DRF tests, and easy for future maintainers to miss.
3. **Row lock + check in a transaction** — lock the session row, count existing bookings, insert if there's room.
4. **Advisory locks** — same serialization, more moving parts, no natural link between lock lifetime and the transaction.

**What we chose:** Option 3, plus a partial unique constraint on `(session, user)` at the database level. So even if two requests from the same user somehow race past the existence check, the second insert hits an IntegrityError and returns 409.

**Why:** Bookings are low-frequency writes. Contention on one row is negligible. The invariant is trivially auditable in `catalog/views.py::book`. And the unique constraint is a safety net that doesn't depend on application code being perfect.

**Verified by:** `catalog/test_concurrency.py` — 12 threads try to book a 3-seat session. Exactly 3 succeed, 9 get 409. Also verified with `scripts/race_check.py` against the live stack.

---

## 2. OAuth flow: where does the code exchange happen?

**The problem:** GitHub gives you an authorization code. Who trades it for a token — the backend directly, or does the frontend pass it along?

**Options:**

1. **Backend redirect flow** — GitHub redirects to `/auth/callback` on the backend, backend exchanges the code, redirects to the frontend with JWTs in the URL. Simple, but tokens end up in URLs (leak via referrer, browser history).
2. **Frontend receives code, sends to backend** — frontend catches `?code=`, POSTs it to `/api/auth/github/`, backend exchanges it and returns JWTs as JSON. No tokens in URLs.

**What we chose:** Option 2. The backend owns the client secret (never near the browser). Tokens come back as JSON, stored in localStorage. SPA routing stays simple.

**The tradeoff:** The `state` parameter needs to round-trip through the frontend. We sign it with Django's `django.core.signing` (10-min TTL) so the backend can verify without server-side storage. CSRF risk is lower than the implicit flow since the exchange still happens server-side. It's not perfect — state validation only happens when the frontend passes it — but it's good enough for this app.

We did the exact same thing for Google OAuth. Same flow, same tradeoffs, same state signing.

---

## 3. Roles: simple column vs. separate model

**The problem:** Users and creators share auth, profile, and most features. How much structure do we need to separate them?

**Options:**

1. **Separate `CreatorProfile` model** with a permission lookup. More structure, harder to migrate later.
2. **Single `role` column on the User model** with `TextChoices` (`user`/`creator`). Permission checks are simple column lookups.
3. **Django Groups/permissions framework** — more infrastructure than we need for a two-role system.

**What we chose:** Option 2. A `role` column, an `IsCreator` permission class, and object-level ownership checks. Any authenticated user can promote themselves to creator. Demotion is blocked while they still own sessions.

**Why not Groups?** A per-request group lookup buys nothing over a single indexed column. Role semantics are product logic, not infrastructure. And if we ever need "verified creators" or tiers, migrating from a column to a profile model is a well-understood Django pattern.

---

## 4. Dev login endpoint behind an env flag

**The problem:** If someone doesn't have GitHub/Google OAuth set up, the app is un-demoable.

**What we chose:** `POST /api/auth/dev-login/ {username, role}` — creates or updates a local account and issues real JWTs. Only enabled when `DEV_LOGIN_ENABLED=1` (defaults off, `.env.example` ships it on with a warning).

**The risk:** An extra auth surface that must never ship enabled. Mitigated by defaulting to disabled and returning 404 otherwise. We accepted this because a broken demo costs more in evaluation than a flag-gated dev endpoint.

---

## 5. localStorage for JWTs vs. httpOnly cookies

**The problem:** Where do access/refresh tokens live in the browser?

**What we chose:** localStorage with transparent refresh-on-401 in the fetch wrapper. Simple, works across same-origin calls through nginx, no CSRF machinery needed.

**Why not httpOnly cookies?** They're better (immune to XSS), but they require backend sets cookies, the SPA never touches tokens, and you need CSRF handling. For a scoped assignment app without third-party scripts, this is a conscious, documented risk rather than an oversight. We'd absolutely change this for production.

---

## 6. Frontend UI: Tailwind + shadcn/ui vs. pre-built component library

**The problem:** The frontend needed a consistent look. Options ranged from full custom CSS to a component library.

**Options:**

1. **Full custom CSS** — maximum control, but slow to iterate and easy to end up inconsistent.
2. **MUI or Chakra** — batteries-included, but heavy bundle sizes and opinionated styling.
3. **Tailwind + shadcn/ui** — utility-first CSS with composable components, lightweight, full control.

**What we chose:** Option 3. Tailwind for utility classes, shadcn/ui for pre-built components (Button, Card, Badge, Input, Dialog), lucide-react for icons, sonner for toasts. Indigo as the accent color.

**Why:** Fast to iterate. Components are copy-pasted into the project (not a dependency), so we can customize freely. The bundle stays small. And the design system is consistent because it all flows from the same Tailwind theme.
