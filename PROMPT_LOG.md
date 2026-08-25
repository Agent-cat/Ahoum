# PROMPT_LOG.md

Log of material AI prompts used while building this assignment. Everything
submitted was reviewed, understood, and (where noted) corrected by me. Tool for
all sessions: opencode CLI agent (model `x-preview-f-free`).

---

### 1. Project bootstrap & stack decisions

- **Prompt:** "Objective: build a compact Sessions Marketplace … [full assignment
  brief pasted]. Required stack: React/Next.js, Django + DRF, PostgreSQL, OAuth +
  JWTs, Docker Compose with nginx."
- **Used:** planning — decomposed the brief into backend apps (`accounts`,
  `catalog`), endpoint list, and the concurrency strategy.
- **Changed/rejected:** the agent initially planned a Vite React SPA and began
  writing Vite files; **I rejected that** and instructed Next.js via
  `npx create-next-app@latest`. I also instructed uv as the Python package
  manager instead of plain pip/requirements.
- **Verified:** reviewed the resulting plan against every checklist item in the
  brief before any code was written.

### 2. Backend implementation (models, OAuth views, booking logic)

- **Prompt:** stepwise instructions: "custom user model with role", "GitHub code
  exchange issuing SimpleJWT tokens", "booking must use select_for_update + unique
  constraint", "use TransactionTestCase with a thread barrier".
- **Used:** most of the generated Django code after line-by-line review; kept the
  row-lock + DB-unique-constraint combination and the signed-OAuth-state idea.
- **Changed/rejected:** removed an unused `OAuthError` exception class and dead
  parameter juggling in `github_authorize_url`; rewrote the booking error mapping
  to go through DRF's exception handler rather than ad-hoc try/except.
- **Verified:** ran the full test suite in Docker (`manage.py test catalog`) and
  exercised endpoints with curl through nginx.

### 3. Concurrency test design

- **Prompt:** "write one automated test that creates the race condition with two
  or more threads and proves final booking count equals capacity."
- **Used:** thread-barrier + ThreadPoolExecutor structure.
- **Changed/rejected:** the generated test contained leftover dead code
  (`connections.close_all() if False else None`) and helper imports scoped inside
  `setUp` (would raise `NameError`). Fixed both by hand; see DEBUGGING.md #5.
  Also renamed the class so the `TransactionTestCase` sorts last alphabetically
  and cannot corrupt state for plain `TestCase` tests.
- **Verified:** suite green; independently confirmed with the standalone
  `scripts/race_check.py` against the live compose stack (12 requests → exactly
  three 201s).

### 4. Next.js 16 conventions research

- **Prompt:** subagent task to read `node_modules/next/dist/docs/` and report
  breaking changes relevant to client-side pages, async params, useSearchParams,
  dev proxying of `/api`.
- **Used:** applied directly — wrapped the OAuth callback's `useSearchParams`
  consumer in `<Suspense>` (production build fails otherwise), kept `params`
  handling Promise-based, used `rewrites()` in `next.config.ts` for dev-time
  `/api` forwarding, avoided `legacyBehavior` on `<Link>`.
- **Changed/rejected:** agent suggested a catch-all route handler as an
  alternative API proxy — unnecessary since nginx handles routing in production;
  rewrites only serve local dev.
- **Verified:** `next build` passes with all 9 routes.

### 5. Debugging assistance

- **Prompt:** pasted tracebacks: (a) `ImportError: Could not import
  'catalog.exceptions.exception_handler'`, (b) `200 != 401` on missing-token
  test, (c) `the --mount option requires BuildKit`, (d) Next build
  `Can't resolve '@/auth'`.
- **Used:** root-cause analysis for each; fixes applied by me in the source
  files.
- **Changed/rejected:** for (c) the suggested fix was enabling BuildKit/buildx;
  I chose removing the cache mount instead since this environment has no buildx
  and the cache is a nice-to-have.
- **Verification:** each fix followed by the failing command re-run until green;
  details recorded in DEBUGGING.md.

---

## What AI got wrong / what I corrected

1. **Silent file overwrite.** AI wrote `catalog/exceptions.py` twice in one
   session (once with the DRF `exception_handler`, once with only custom
   exception classes); the second write destroyed the first, crashing every API
   view at settings-import time. Diagnosed from the ImportError traceback and
   merged the two versions into one module.
2. **Broken test scaffolding.** The generated concurrency test shipped with dead
   code (`if False else None`) and imports trapped inside `setUp()` that test
   methods could not see. Would have produced `NameError`s on first run; cleaned
   up and restructured before ever running the suite.
3. **Wrong permission model assumption.** AI assumed `@api_view` endpoints are
   authenticated by default because JWT authentication was configured globally;
   in fact authentication ≠ authorization and DRF defaults to `AllowAny`, so
   `/api/me/` returned 200 anonymously until `IsAuthenticated` was added.
4. **Hallucinated download URL.** When installing the GitHub CLI, AI guessed a
   pinned release URL (`gh_2.76.2_linux_amd64.tar.gz`) that returned 404; fixed
   by resolving the actual latest tag from the releases redirect.
