# DEBUGGING.md

Real problems we hit, how we found them, and how we fixed them. No hypotheticals — these are actual bugs that showed up during development.

---

## 1. Unauthenticated request to `/api/me/` returned 200 instead of 401

**What happened:** The test `test_missing_token_gets_401` kept failing — expected 401, got 200. A request with no Authorization header just... worked. Returned the anonymous user profile like nothing was wrong.

**How we found it:** Test failure. Reproduced with curl against the live container — `curl http://localhost/api/me/` returned a 200 with an empty-ish profile.

**Root cause:** DRF's default permission class is `AllowAny`. Our `me` view relied on JWT authentication to resolve `request.user`, but nothing *required* that user to be authenticated. An `AnonymousUser` just walked through.

**The fix:** Added `@permission_classes([IsAuthenticated])` to the `me` view in `accounts/views.py`. Now missing/garbage tokens return 401 with DRF's standard JSON error body.

**Verification:** Full test suite green. Missing-token and garbage-token cases both return 401 now.

---

## 2. Every API view errored at startup: `ImportError: Could not import 'catalog.exceptions.exception_handler'`

**What happened:** All 10 tests failed — 6 errors, 4 failures. Every traceback ended in DRF settings trying to import `EXCEPTION_HANDLER`.

**How we found it:** Running `manage.py test catalog`. The traceback pointed at `catalog/exceptions.py`.

**Root cause:** We wrote that file twice. First time, it had the custom `exception_handler` function (which maps `IntegrityError` to 409). Second time, we rewrote it with just the exception classes (`Conflict`, `Gone`) and accidentally destroyed the handler function. Classic "two sources of truth for one file" mistake.

**The fix:** Merged both concerns back into one module — the `Conflict` exception class AND the `exception_handler` function, both in `catalog/exceptions.py`.

**Verification:** Full suite green (`Ran 10 tests OK`). The double-book case correctly returns 409 through the handler path.

---

## 3. Docker build failed: "the --mount option requires BuildKit"

**What happened:** `docker compose up --build` died on the backend image at `RUN --mount=type=cache,target=/root/.cache/uv uv sync`.

**How we found it:** Build output. The error message was clear about BuildKit.

**Root cause:** The Dockerfile used a cache-mount idiom that assumes BuildKit/buildx, which this machine doesn't have. `docker buildx version` confirmed buildx was not installed.

**The fix:** Dropped the cache mount — `RUN uv sync --frozen --no-dev` instead. uv's own link-mode caching inside the layer is enough for a project this size.

**Verification:** Clean rebuild of all four images, `docker compose up -d`, all services healthy.

---

## 4. Next.js build failed: `Can't resolve '@/auth'`

**What happened:** `next build` failed across several pages with `Module not found: Can't resolve '@/auth'`.

**How we found it:** Running `next build`. The error pointed at specific page files.

**Root cause:** After choosing where shared code lives (`src/`), a bulk rename from `@/auth` to `@/src/auth` missed a few files. `tsconfig.json` maps `@/*` to `./*`, but the auth module lives at `src/auth.tsx`, so the import should be `@/src/auth`.

**The fix:** Normalized all imports to `@/src/...` pattern. Grepped for the old aliases and fixed stragglers.

**Verification:** `next build` completes — all 10 routes compiled. Static/dynamic markers correct.

---

## 5. `useSearchParams` crash in production build

**What happened:** `next build` threw a React error about `useSearchParams` being used outside a `<Suspense>` boundary. Worked fine in dev mode, failed in production.

**How we found it:** Production build. Dev mode doesn't enforce this constraint.

**Root cause:** Next.js 16 requires `useSearchParams` consumers to be wrapped in `<Suspense>`. Our OAuth callback pages used `useSearchParams` to grab the `?code=` parameter, but weren't wrapped.

**The fix:** Wrapped the callback component content in `<Suspense fallback={<Spinner />}>`.

**Verification:** Build passes. Auth flows still work.

---

## 6. OAuth callback used `router.replace` — navbar didn't update after login

**What happened:** User signs in with Google, gets redirected to the callback page, sees the toast "Signed in!" but the navbar still shows "Sign in" instead of "Sign out" and the user's name.

**How we found it:** Manual testing. Clicked through the OAuth flow, saw the stale nav.

**Root cause:** `router.replace` reuses the same React tree. The AuthProvider's user state updates, but the Nav component was reading from a stale closure. Next.js 16's client-side navigation doesn't force a full re-render of layout components the way a page reload does.

**The fix:** Changed OAuth callbacks from `router.replace("/")` to `window.location.href = "/"`. Forces a full page reload, which re-initializes the AuthProvider and re-fetches user data.

**Verified by:** Running the OAuth flow end-to-end — navbar updates correctly after sign-in.

---

## 7. Race test had dead code and misplaced imports

**What happened:** The concurrency test was designed to run 12 threads against a 3-seat session. But the test scaffolding had leftover dead code (`connections.close_all() if False else None`) and helper imports (`timedelta`, `timezone`) buried inside `setUp()` where test methods couldn't see them.

**How we found it:** Code review before running. Would have raised `NameError` on first execution.

**Root cause:** Generated test code that was edited by hand without actually running it first.

**The fix:** Removed dead code, moved imports to module scope, documented why each thread closes its thread-local connection.

**Verification:** Suite runs deterministically. Exactly 3 successes out of 12 parallel attempts, zero duplicate `(user, session)` bookings.

---

## 8. "Already booked" sessions showed redundant seat info

**What happened:** On the sessions list page, a session you already booked would show something like "1 of 3 seats available" AND "Booked" — which is confusing because the seat info is irrelevant once you've booked.

**How we found it:** Manual testing after the booking flow was complete.

**Root cause:** The seat info display was unconditional. We weren't checking whether the user had already booked.

**The fix:** Fetched the user's bookings on mount, built a `Set` of booked session IDs, and conditionally showed "Booked" badge/button instead of "View & Book". The seat count still shows, but it's contextual — the button state makes it clear what's relevant.
