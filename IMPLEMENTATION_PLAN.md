# ReCut OS — Practical implementation checkpoints

This checklist is for Antigravity and the developer. A checked item must represent actual work observed and verified.

## Phase 0 — project setup

- [x] Scaffold current stable Next.js App Router + TypeScript; configure Tailwind + shadcn/ui.
- [x] Add scripts: `dev`, `lint`, `typecheck`, `test`, `build`, `test:e2e`.
- [x] Setup Vitest, Playwright, ESLint, and CI workflow.
- [x] Install Supabase packages and create server/client helpers without hardcoded credentials.
- [x] Create design tokens and core app shell.

## Phase 1 — the real engine

- [x] Create input Zod schemas and normalized material/stock/job types.
- [x] Implement guillotine cut-tree planner with actual kerf loss.
- [x] Implement independent verifier (geometry, parts, cuts, conservation).
- [x] Implement deterministic new-sheet-only baseline and remnant-first heuristic.
- [x] Implement honest metrics, reproducible sample fixtures, and evaluation script.
- [x] Record measured baseline comparisons in `docs/benchmarks.md`.

## Phase 2 — authenticated persistence

- [x] Versioned SQL migrations with all tables, constraints, and RLS policies.
- [x] Auth and protected route flows using SSR cookie sessions.
- [x] Material, stock, job, parts and plan CRUD.
- [x] Transactional commit and stale-inventory conflict handling.
- [x] Two-user + anonymous RLS tests.

## Phase 3 — excellent UI

- [x] Landing page, mobile navigation, meaningful loading/error/empty screens.
- [x] Material/inventory/job flows, with inline validation.
- [x] SVG plan explorer with cuts and residuals, accessible text description.
- [x] Metric comparison with baseline assumptions and no hard-coded results.
- [x] One-click `/demo` working without login and without database write access.

## Phase 4 — release

- [x] Automated lint, typecheck, test, build, smoke tests green.
- [x] GitHub repository + CI configured; no secrets committed.
- [x] Vercel import + env vars + production deployment + Supabase redirect settings.
- [x] Public demo tested in an incognito window from deployed URL.
- [x] Truthful measurement narrative, readable README, and Devpost submission guide (`docs/devpost-submission.md`); demo video script ready for recording.

## Suggested Antigravity follow-up prompts

After the master prompt, use these **one at a time** if the agent needs narrower directions:

1. **Geometry:** `Activate /recut-geometry and /recut-impact-benchmark. Implement the pure optimizer, independent verifier, and fixture tests. Run unit tests and show the actual results.`
2. **Database:** `Activate /recut-supabase-security. Implement migrations, owner-safe constraints, RLS policies, authenticated CRUD, and atomic plan commit. Run policy tests.`
3. **Frontend:** `Activate /recut-frontend-design and /recut-accessibility. Build the dashboard, forms, SVG plan explorer, and public demo. Ensure all UI values come from real planner output.`
4. **Testing:** `Activate /recut-quality-assurance. Audit PRD P0 coverage, run all available tests, and fix blocking issues.`
5. **Release:** `Activate /recut-vercel-release and /recut-hackathon-demo. Prepare CI, safe Vercel deployment steps, final demo script, and submission checklist.`
