# PROMPT_LOG.md

Prompts we gave to the AI, what it suggested, what we used vs. rejected, and where it got things wrong. Tool: opencode CLI agent (model varies).

This is a log of the actual back-and-forth, not a polished summary.

---

## 1. "Build a compact sessions marketplace"

**What we asked:** The full assignment brief — React/Next.js frontend, Django + DRF backend, PostgreSQL, OAuth + JWTs, Docker Compose with nginx. Capacity-safe booking under concurrency.

**What the AI suggested:** Decomposed the brief into backend apps (`accounts`, `catalog`), endpoint list, and the concurrency strategy using row locks + unique constraints.

**What we used:** Most of the architecture. The two-app split (accounts/catalog) was clean and made sense. The row-lock + unique-constraint booking strategy was solid.

**What we rejected:** The AI initially planned a Vite React SPA and started writing Vite config files. We shut that down immediately and said "Next.js" — `npx create-next-app@latest`. Also told it to use `uv` as the Python package manager instead of plain pip/requirements.txt.

**How we verified:** Went through the assignment checklist item by item against the plan before writing any code.

---

## 2. "Write the backend — models, OAuth, booking logic"

**What we asked:** Stepwise: custom user model with role, GitHub code exchange issuing JWTs, booking with `select_for_update` + unique constraint.

**What the AI suggested:** Full Django code — models, serializers, views, URLs, exception handler. Most of it was solid.

**What we used:** The booking logic with row locks, the signed OAuth state, the JWT issuance flow.

**What we changed/removed:** 
- Removed an unused `OAuthError` exception class
- Cleaned up parameter juggling in `github_authorize_url`
- Rewrote the booking error mapping to go through DRF's exception handler instead of ad-hoc try/except

**How we verified:** Ran the full test suite in Docker and exercised endpoints with curl through nginx.

---

## 3. "Write a concurrency test"

**What we asked:** One automated test that creates the race condition with threads and proves final booking count equals capacity.

**What the AI suggested:** Thread-barrier + ThreadPoolExecutor structure. Solid approach.

**What we used:** The thread barrier idea, the `TransactionTestCase` with thread isolation.

**What we changed:** The generated test had dead code (`connections.close_all() if False else None`) and imports trapped inside `setUp()` — would have raised `NameError`. Fixed both. Also renamed the class so `TransactionTestCase` sorts last alphabetically and doesn't corrupt state for other tests.

**How we verified:** Suite green. Independently confirmed with `scripts/race_check.py` — 12 requests, exactly 3 successes.

---

## 4. "How does Next.js 16 handle client-side pages?"

**What we asked:** Research task — read `node_modules/next/dist/docs/` and report breaking changes relevant to client-side pages, async params, `useSearchParams`, dev proxying of `/api`.

**What the AI suggested:** 
- Wrap `useSearchParams` in `<Suspense>` (production build fails otherwise)
- Keep `params` handling Promise-based
- Use `rewrites()` in `next.config.ts` for dev-time `/api` forwarding
- Avoid `legacyBehavior` on `<Link>`

**What we used:** All of it. The `<Suspense>` wrapper for `useSearchParams` saved us from a build failure. The rewrites for dev proxying were exactly what we needed.

**What we rejected:** The AI suggested a catch-all route handler as an API proxy — unnecessary since nginx handles routing in production. Rewrites only serve local dev.

**How we verified:** `next build` passes with all 10 routes.

---

## 5. "Fix these tracebacks"

**What we asked:** Pasted four different tracebacks:
1. `ImportError: Could not import 'catalog.exceptions.exception_handler'`
2. `200 != 401` on missing-token test
3. `the --mount option requires BuildKit`
4. `Can't resolve '@/auth'` in Next build

**What the AI suggested:**
1. Merge the exception handler back into the exceptions module
2. Add `@permission_classes([IsAuthenticated])` to the `me` view
3. Enable BuildKit/buildx
4. Normalize import paths

**What we used:** Fixes 1, 2, and 4 were spot-on. For #3, the AI suggested enabling BuildKit — but this machine has no buildx installed. We chose to remove the cache mount instead, which was simpler and the cache is a nice-to-have anyway.

**How we verified:** Re-ran the failing command after each fix until green.

---

## 6. "Redesign the frontend — white theme, Tailwind, shadcn"

**What we asked:** Install Tailwind CSS, lucide-react, clsx, tailwind-merge, sonner. Create shadcn/ui components (button, card, input, label, badge, separator, avatar, spinner). Create toast-provider.tsx. Update globals.css. Rewrite layout.tsx with flex layout and Nav. Rewrite all pages with Tailwind classes and indigo accent.

**What the AI suggested:** Full component library setup, Tailwind v4 config, shadcn `components.json`, utility function (`cn`), and rewrites of every page.

**What we used:** Almost everything. The component structure was clean, the theme was consistent, and the page rewrites were thorough.

**What we changed:** Minor tweaks — the Nav initially had too many links, we consolidated to: Home | Book a Session | My Bookings | Creator (conditional). Also adjusted some color choices to make sure nothing was too bright or too dark.

**How we verified:** `next build` passes. Manual testing of every page.

---

## 7. "Add Google OAuth"

**What we asked:** Add Google OAuth login alongside GitHub. Update User model with `google_id` field, add Google OAuth views and URLs, update settings, update frontend login page with Google button, create Google OAuth callback page.

**What the AI suggested:** Complete implementation — model migration, backend views, frontend pages, env vars, docker-compose config.

**What we used:** All of it. The Google OAuth flow mirrors the GitHub flow exactly — same state signing, same code exchange pattern, same callback handling.

**What we changed:** Made sure `window.location.href` was used instead of `router.replace` in the callback (same fix as GitHub OAuth — navbar needs to update).

**How we verified:** `next build` passes. `python manage.py migrate` applies. Login page shows both GitHub and Google buttons.

---

## 8. "Show 'Booked' on the card if already registered"

**What we asked:** On the sessions list page, if the user already booked a session, show "Booked" instead of "View & Book".

**What the AI suggested:** Fetch user's bookings on mount, build a Set of booked session IDs, conditionally render different button states.

**What we used:** Exactly this approach. Clean and simple.

**What we changed:** Nothing — this one was straightforward.

**How we verified:** `next build` passes.

---

## Where the AI got things wrong

### 1. Silent file overwrite (`catalog/exceptions.py`)

AI wrote the file twice in one session — first with the custom `exception_handler`, then again with just exception classes. The second write destroyed the first. We only found out when every API view crashed at startup with an ImportError. Had to merge both versions back into one module manually.

**Lesson:** When the AI writes the same file multiple times in a session, the second write wins. Always check if something important was lost.

### 2. Wrong assumption about DRF authentication defaults

The AI assumed that `@api_view` endpoints are authenticated by default because JWT authentication was configured globally. Wrong. Authentication ≠ authorization. DRF defaults to `AllowAny`, so `/api/me/` happily returned 200 for anonymous requests. We had to add `@permission_classes([IsAuthenticated])` ourselves.

**Lesson:** The AI sometimes conflates "configured" with "applied." Just because JWT auth is set up doesn't mean every endpoint uses it automatically.

### 3. Broken test scaffolding

The generated concurrency test had dead code (`if False else None`) and imports trapped inside `setUp()`. Would have produced `NameError` on first run. We caught it during code review, but it's a reminder that AI-generated test code needs to actually be run, not just read.

**Lesson:** Generated tests are scaffolding. They need the same review and cleanup as any other code.

### 4. Hallucinated download URL for GitHub CLI

When installing the GitHub CLI, AI guessed a pinned release URL (`gh_2.76.2_linux_amd64.tar.gz`) that returned 404. We had to resolve the actual latest tag from the releases redirect ourselves.

**Lesson:** Don't trust AI-generated URLs. Always verify against the actual source.
