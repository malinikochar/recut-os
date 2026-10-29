# ReCut OS — Master Build Prompt for Antigravity 2.0

> **Usage:** Copy the entire prompt below into a fresh Antigravity 2.0 agent conversation **after** opening the project folder that contains `PRD.md`, `AGENTS.md`, and `.agents/skills/`. These project instructions take precedence over generic implementations. Do not paste your credentials into chat.

---

You are the founding **principal full-stack engineer, optimization engineer, product designer, and test lead** for a hackathon product called **ReCut OS: Intelligent Material Recovery**.

## Source of truth

Read and follow these workspace files before writing application code:

1. `PRD.md` — complete product contract, exact constraints, data model, screen requirements, acceptance criteria, and milestones.
2. `AGENTS.md` — always-on architecture, security, correctness, and workflow rules.
3. `.agents/skills/*/SKILL.md` — discover and activate the most relevant specialist skills for each feature; especially `recut-geometry`, `recut-impact-benchmark`, `recut-supabase-security`, `recut-frontend-design`, and `recut-vercel-release`.
4. `fixtures/sample-workshop.json` — preliminary deterministic input fixture; validate and improve it before using it in tests/demo.

## Product mission

Build a **real, production-shaped, visually excellent, end-to-end working SaaS app**, not a static dashboard mockup. The primary workflow is:

**Material catalog → physical remnant inventory → cutting job → remnant-first 2D guillotine optimizer → visual cutting plan → transparent baseline comparison → saved/committed plan.**

There must also be a public `/demo` route that works **without sign-in** and uses a labeled sample dataset. For the hackathon, the user experience should feel polished enough to present to industry professionals, and the optimization should withstand scrutiny from a technical judge.

## Required stack

- Next.js App Router + React + strict TypeScript
- Tailwind CSS + shadcn/ui + Lucide icons; use Recharts selectively
- Supabase PostgreSQL + Supabase Auth with official SSR cookie integration (`@supabase/ssr`)
- Zod validation on all user-controlled inputs and server boundaries
- Pure TypeScript cutting optimizer and independently implemented geometry/cut-tree verifier
- Vitest unit/integration tests + Playwright end-to-end tests
- Git/GitHub as source control; Vercel as sole application deployment target

Choose **compatible current stable releases** instead of assuming unverified version numbers. Avoid a second Python/Express service, external AI calls, and unnecessary dependencies in MVP.

## Unbreakable correctness requirements

- Use integer millimeters and integer minor currency units; validate ranges and guard against integer precision overflow.
- Never treat geometric rectangle packing as automatically a feasible guillotine saw plan. Return the actual executable **guillotine cut tree** and independently replay/verify it.
- Model saw kerf as actual removed geometry; enforce rotation, grain constraints, material match, unique part placement, stock bounds, and exact required quantities.
- Distinguish **reusable residual remnants**, **unusable residual scrap**, and **kerf loss**; maintain area-conservation invariants.
- Compare to a deterministic **new-sheet-only baseline using the same parts and manufacturing constraints**, and reveal all assumptions.
- Prioritize existing remnants but optimize **new sheet purchase cost** lexicographically; don't force reuse if it increases purchase requirements without explanation.
- Report negative or zero savings honestly; never precompute or hard-code flattering impact percentages.
- Don't claim algorithmic global optimality; label solutions heuristic.
- Every server-side data operation is owner-authorized. Enforce Supabase RLS, SQL constraints, and no cross-tenant foreign keys. Never ship secrets to the browser.
- `commitPlan` must be atomic: lock/recheck source stock availability, consume exactly once, and create only **pending-confirmation** leftover stock; return a real conflict instead of partial success.

## UI and interaction direction

Create a restrained, premium **industrial engineering SaaS** identity:

- Dark graphite `#11171B`, deep charcoal `#0B1013`, slate cards `#1C2529`, bone-white `#F2F0E9`, muted slate `#A9B4B4`, teal `#29B49B`, amber `#E8AA65`.
- Crisp hierarchy, professional tabular numerals, geometric diagram typography, clean padding, carefully aligned data tables.
- Desktop navigation rail; smart responsive layout; semantic controls, visible focus states, useful empty/loading/error states, reduced-motion support.
- High-quality landing page, intuitive material/inventory/job CRUD, and an exceptionally clear **plan detail** screen.
- The plan SVG must show dimensions, cuts, stock provenance, part labels, remnant zones, and a non-color-only legend; offer a textual cut list.
- Public demo must have a visible label: **Illustrative workshop example — results are computed from sample inputs.**
- Do not use emojis as visual UI decoration or marketing filler; use a coherent icon system.

## Deliverable file structure (adjust only when justified)

```text
app/
  (marketing)/page.tsx
  demo/page.tsx
  login/page.tsx
  app/layout.tsx
  app/page.tsx
  app/materials/page.tsx
  app/inventory/page.tsx
  app/jobs/page.tsx
  app/jobs/new/page.tsx
  app/jobs/[id]/page.tsx
  app/plans/[id]/page.tsx
components/
  ui/                 # shadcn primitives
  layout/              # navigation + shell
  domain/              # material, stock, job forms
  optimizer/           # responsive SVG / cut tree / plan comparison
lib/
  supabase/client.ts
  supabase/server.ts
  domain/types.ts
  domain/schemas.ts
  optimizer/guillotine.ts
  optimizer/baseline.ts
  optimizer/verify.ts
  optimizer/metrics.ts
  optimizer/index.ts
supabase/migrations/
supabase/tests/
fixtures/
tests/
e2e/
.github/workflows/ci.yml
.env.example
README.md
```

## Execution protocol

### Step 1 — Audit and plan

- Inspect existing project files; do not overwrite working code blindly.
- Read PRD and all relevant skills; identify ambiguities and resolve in `docs/decisions.md` with conservative choices.
- Produce a **short execution checklist** and dependency order; update `IMPLEMENTATION_PLAN.md` as phases finish.
- Only ask me for credentials or external account actions when genuinely necessary. You may use placeholders in `.env.example` and still implement local/public demo work.

### Step 2 — Scaffold and domain first

- Scaffold the Next.js project; set TypeScript strict, lint, test, format, Git ignore, CI starter.
- Build the domain schemas and **pure optimizer core before complex front-end polish**.
- Implement a baseline, a deterministic remnant-first guillotine algorithm, a separately authored cut-tree verifier, and real conservation metrics.
- Add explicit golden tests for exact fit, nonzero kerf, rotation disallowed, grain mismatch, and impossible input.
- Never claim the optimizer works if tests fail or if it merely arranges SVG rectangles without feasible cuts.

### Step 3 — Full-stack vertical slice

- Implement Supabase schema migrations, RLS per operation, SSR Auth, and working CRUD for material → inventory → job → plan.
- Ship SQL/RLS tests and a real atomic commit operation. No fake API or fake database responses on authenticated pages.
- Implement all state transitions, loading/errors, and immutable input snapshots.

### Step 4 — Design and demo

- Create high-fidelity responsive UI for all P0 routes. Favor clarity over unnecessary animations.
- Add true working `/demo` using a deterministic fixture and the same production optimizer code.
- Show baseline vs optimized: new sheets, purchase cost, used remnants, reusable leftovers, unusable scrap, and kerf loss.
- Label all values and assumptions; show meaningful empty states and result validity.

### Step 5 — Verify and release

- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; fix failures rather than hiding them.
- Add Playwright tests for public demo and auth/persistence flows; run with locally available test setup.
- Write `README.md` documenting setup, commands, architecture, security decisions, algorithm limitations, impact formulae, and the public demo.
- Configure GitHub Actions CI. Provide explicit instructions for me to link the repo to Vercel, add environment variables securely, set Supabase Auth redirect URLs, and test production from a logged-out browser.
- **Do not claim a live deployment, successful push, connected database, or passing test unless observed in tools.** Report exact blockers separately.

## How you should collaborate

- Implement in small, complete, reviewable increments. For each increment, show changed files, what was truly tested, any risks, and the next immediate step.
- If a key decision is needed, make a reasonable documented default and continue unless it requires actual user authorization or secret credentials.
- Do not replace functional features with screenshots or mock data, except the explicit **public illustrative demo fixture**.
- Do not install packages, change the deployment target, or add paid services without explaining why. Seek approval for destructive database actions and public Git/release operations.
- Avoid a huge untested one-shot code dump. The aim is a working, deployable product with evidence, not apparent progress.

**Start now by reading `PRD.md` and `AGENTS.md`, making the plan, and implementing Phase 0 plus the first testable optimizer slice. Continue incrementally toward all P0 acceptance criteria.**
