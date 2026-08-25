# DEBUGGING.md

Real issues encountered while building and testing, with symptom → diagnosis →
root cause → fix → verification.

---

## 1. Unauthenticated request to `/api/me/` returned 200 instead of 401

- **Symptom.** `test_missing_token_gets_401` failed: `200 != 401`. A request with
  no `Authorization` header happily returned the (anonymous) profile payload.
- **Diagnosis.** The test failure was the only visible signal; curl against a
  live container reproduced it.
- **Root cause.** DRF's default permission class is `AllowAny`, and
  `@api_view` endpoints get no implicit authentication requirement. My `me`
  view relied on JWT *authentication* to resolve `request.user`, but nothing
  required that user to be authenticated — an `AnonymousUser` sailed through.
- **Fix.** Added `@permission_classes([IsAuthenticated])` to the `me` view
  (`accounts/views.py`).
- **Verification.** Re-ran `manage.py test catalog`: missing-token and
  garbage-token cases now return `401` with SimpleJWT's JSON error body
  (`{"detail": …, "code": …}`), confirmed in the passing suite.

## 2. Every API view errored at startup: `ImportError: Could not import
'catalog.exceptions.exception_handler'`

- **Symptom.** All 10 tests failed: 6 errors + failures, every traceback ending
  in DRF settings trying to import `EXCEPTION_HANDLER`.
- **Diagnosis.** Read the traceback bottom-up; inspected `catalog/exceptions.py`
  and found it only defined `Conflict`/`Gone` — no `exception_handler`.
- **Root cause.** I had written the file twice: first with the custom handler
  (mapping `IntegrityError` → 409), later again with just the exception classes;
  the second write silently overwrote the first. A classic "two sources of truth
  for one file" mistake, invisible until anything imported DRF settings.
- **Fix.** Merged both concerns into one module: `Conflict` exception + the
  `exception_handler` that converts `IntegrityError` into a 409 conflict.
- **Verification.** Full suite green (`Ran 10 tests … OK`); additionally the
  double-book case returns `409` via the constraint path.

## 3. Docker image build failed: "the --mount option requires BuildKit"

- **Symptom.** `docker compose up --build` aborted on the backend image at
  `RUN --mount=type=cache,target=/root/.cache/uv uv sync …`.
- **Diagnosis.** Error message pointed at BuildKit; `docker buildx version`
  showed buildx was not installed in this environment, so the legacy builder ran
  regardless of `DOCKER_BUILDKIT=1`.
- **Root cause.** I used a cache-mount idiom that assumes BuildKit/buildx,
  which this machine's Docker setup doesn't have.
- **Fix.** Dropped the cache mount (`RUN uv sync --frozen --no-dev`); uv's own
  link-mode caching inside the layer is enough for this project size.
- **Verification.** Clean rebuild of all four images and `docker compose up -d`;
  all services healthy.

## 4. Frontend production build failed on module resolution (`Can't resolve '@/auth'`)

- **Symptom.** `next build` failed: `Module not found: Can't resolve '@/auth'`
  in several pages.
- **Diagnosis.** Compared imports against `tsconfig.json`: the scaffold maps
  `@/* → ./*`, but my shared modules live under `src/`, so `@/auth` should have
  been `@/src/auth`. One file (`src/components/Nav.tsx`) still held the old
  alias after my bulk rename.
- **Root cause.** Inconsistent import paths after choosing where shared code
  lives; a partial sed-based rename left stragglers.
- **Fix.** Normalized all imports to `@/src/...` and re-ran the build.
- **Verification.** `next build` completes: 9 routes compiled, static/dynamic
  markers as expected; app served correctly through nginx afterwards.

## 5. Race-test design pitfall caught before it could produce false confidence

- **Symptom.** (Design review, not runtime.) The concurrency test originally had
  leftover dead code (`connections.close_all() if False else None`) and helper
  imports buried inside `setUp`, which would have raised `NameError` in test
  bodies.
- **Root cause.** Generated test scaffolding edited by hand without running it.
- **Fix.** Removed dead code, moved `timedelta`/`timezone` imports to module
  scope, documented why each thread closes its thread-local connection.
- **Verification.** Suite runs deterministically; race test asserts exactly
  `capacity` successes out of 12 parallel attempts and zero duplicate
  `(user, session)` bookings.
