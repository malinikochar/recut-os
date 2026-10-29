# ReCut OS — Product Requirements Document

> **Version:** 1.0 | **Status:** Hackathon MVP specification | **Updated:** 2026-10-30  
> **Product:** ReCut OS — Intelligent Material Recovery  
> **Track:** Arbiter Hacks V1 / Rethinking Waste  
> **Owner:** Project creator  
> **Target delivery:** Before the hackathon submission deadline; verify the official schedule before final submission.

---

## 1. Executive summary

**ReCut OS is a remnant-first, two-dimensional material cutting planner for small workshops.** It helps a furniture maker or fabrication shop fulfill rectangular cutting orders using existing offcuts first, then the minimum practical number of newly purchased sheets. Users create a material catalog, record physical sheet/remnant inventory, enter a job's required parts, generate feasible guillotine cutting layouts, compare against a transparent baseline, and save a production plan.

The product's core promise is **less newly purchased material, fewer forgotten offcuts, and explainable decisions**. This is a planning tool, not a CNC machine controller. Never claim that a geometry layout is manufacturable unless the algorithm validates dimensions, saw kerf, rotation, material compatibility, and cut sequence.

### One-sentence pitch

> ReCut OS converts workshop leftovers into a searchable material bank and produces feasible cutting plans that prioritize reuse before buying new sheets.

### Product principles

1. **Real optimization over superficial AI.** A deterministic, tested cutting optimizer is the centerpiece; a generative AI API is not necessary.
2. **Physical feasibility over pretty diagrams.** Every placement must pass geometry and cut-tree checks.
3. **Honest impact.** Show baseline assumptions and measured/simulated outcomes without inventing environmental savings.
4. **Remnants are inventory, not automatically waste.** Recoverable leftovers and true scrap are separate categories.
5. **Demo in one click.** Judges must see an end-to-end result without needing credentials or sample data entry.
6. **Security by construction.** Authenticated data belongs only to its owner; implement and test Supabase RLS.

---

## 2. Problem and opportunity

Small woodworking and acrylic fabrication shops frequently cut rectangular parts from standard-sized sheets. They also accumulate irregularly useful rectangular offcuts. Existing workflows may store remnant dimensions in a notebook or not record them at all. When the next order arrives, staff may purchase a new sheet rather than identify an existing suitable remnant.

**Opportunity:** A fast planning application that knows stock geometry and prices can propose reusable-stock-first layouts and quantify the trade-off against a simple purchasing/cutting baseline. ReCut OS intentionally restricts MVP inputs to **rectangular sheets and rectangular parts** to deliver reliable results in a hackathon timeframe.

### Target user and jobs-to-be-done

| Persona | Context | Job-to-be-done |
|---|---|---|
| Workshop owner (primary) | Small wood/acrylic sheet shop | Know whether existing stock can fulfill a new cutting order before purchasing materials. |
| Production planner (secondary) | Handles multiple part sizes | Produce understandable, measurable cutting layouts with kerf and rotation constraints. |
| Hackathon judge (demo audience) | Has limited evaluation time | Run a preloaded scenario and inspect before/after metrics and cut feasibility in minutes. |

### Current alternatives

Manual cutting diagrams, general-purpose spreadsheets, basic bin-packing websites, and dedicated nesting software. The differentiator is **persistent, traceable remnant inventory + source selection + transparent cross-job purchase comparison**, not the invention of bin packing.

---

## 3. Goals, non-goals, and key metrics

### MVP goals (P0)

- Create and manage a **material catalog** with sheet dimensions, cost, kerf, rotation/grain settings, and reuse thresholds.
- Create individual **stock units**: full sheets or rectangular remnants, with unique IDs and availability state.
- Create a job containing rectangular parts with dimensions, quantity, material, and rotation constraints.
- Generate **feasible guillotine cut trees** and cutting diagrams prioritizing available stock, then virtual new sheets.
- Compare against a clearly documented, deterministic **baseline** with identical demand and manufacturing constraints.
- Display separate metrics for new sheets purchased, purchase cost, recoverable remnants, unusable scrap, and remnant inventory consumed.
- Save/read a plan in Supabase for a signed-in user; support an easy, read-only **public demo with a deterministic fixture**.
- Provide an authenticated, **atomic “commit plan” action** that verifies stock is still available before consuming input stock and creating resulting remnant stock; otherwise return a conflict and ask the user to replan.
- Ship a responsive, accessible, stable hosted site on Vercel with a public GitHub repository and test evidence.

### P1 (only after MVP works)

- Upload/download orders as CSV (with row-level validation and preview).
- Export a printable cutting sheet (browser print with SVG and part list).
- Compare multiple heuristic attempts, adjustable time budget, and interactive side-by-side plans.
- Basic aggregated insights across committed jobs.

### Explicit non-goals for hackathon MVP

- Non-rectangular CNC nesting, curves, arbitrary polygons, or machine control/G-code generation.
- Scheduling workers/machines, vendor procurement, invoices, payments, real-time multi-workshop collaboration.
- Vision-based offcut measurement and automated CO₂ claims.
- Enterprise-scale global exact optimality proof. Results are **heuristic**, not guaranteed mathematically optimal.
- Unverified physical inventory reconciliation; actual remnants must be confirmed by a human.

### Success metrics

| Metric | Definition / target |
|---|---|
| Correctness | **100%** of accepted placements pass geometry, kerf, stock, quantity, material, cut-tree feasibility checks in automated tests. |
| Baseline comparison | Same demand and manufacturing constraints; optimizer must never be reported as better without computed evidence. |
| Demonstration speed | A judge can start the demo and see a saved/generated plan in **≤ 3 clicks**. |
| Performance target | A representative fixture of ≤ 40 parts expanded from quantities, ≤ 15 available stock units, ≤ 2 materials should finish in **≤ 3s** in a normal developer environment; show clear timeout behavior. |
| Reliability | No uncaught UI exception on the happy path, empty state, failed request, or impossible job. |
| Security | Anonymous and cross-user reads/writes to private tables fail in automated policy tests. |
| Impact | Report absolute new-sheet and cost differences plus conditional percentage changes; never promise a particular savings percentage before benchmarks. |

---

## 4. Scope and user stories

### P0: Material catalog

- **US-01:** As a workshop owner, I can add/edit a material (e.g., 18mm Birch Plywood) so the app knows size and cost of a standard new sheet.
- **US-02:** I can define an integer kerf in millimeters (e.g., 3 mm), whether rotation is permissible, and minimum reusable remnant dimensions.
- **Acceptance:** Material-specific dimensions and cost must be > 0; only valid positive integer millimeters; price stored in **minor currency units**; invalid form shows inline feedback.

### P0: Inventory

- **US-03:** I can add each real physical sheet or rectangular remnant separately, with material, dimensions, origin, label, and status.
- **US-04:** I can filter stock by material, status, and size, and distinguish already-available remnants from new sheets.
- **Acceptance:** Stock cannot be assigned twice to committed plans; dimensions must fit the material category; consumed stock is shown in history and never offered as available.

### P0: Job entry

- **US-05:** I can create a job, choose material, and add parts with label, width, height, quantity, and rotation allowed or locked.
- **US-06:** I can duplicate/delete part rows and receive a clear explanation if a part exceeds every usable stock size.
- **Acceptance:** Quantity is bounded (1–50 per row, 100 expanded parts per job initially), missing inputs are blocked, and material mismatch never silently substitutes stock.

### P0: Optimization

- **US-07:** I can select a job and generate a feasible plan showing which pieces are cut from which available remnants, existing full sheets, and virtual newly purchased sheets.
- **US-08:** I can inspect each sheet's scaled SVG layout with part IDs, legend, dimensions, cut-tree order, kerf areas, and recoverable/scrap zones.
- **US-09:** I can compare the result with a baseline and see the assumptions alongside metrics.
- **Acceptance:** The optimizer may return a feasible but suboptimal plan; it **must not** return overlapping placements, missing parts, impossible cuts, or negative material dimensions. Infeasible requests show structured reasons.

### P0: Saved plans and application

- **US-10:** I can save and revisit plans with immutable input snapshots and optimizer version/seed.
- **US-11:** I can explicitly commit a plan and make its input stock unavailable, while recording physically recoverable rectangular remnants as **pending confirmation** (not automatically available until confirmed).
- **US-12:** A visitor can explore a seeded, read-only demonstration without signing in or modifying real workshop data.
- **Acceptance:** A stale plan commit fails atomically if input stock has changed. The user never sees a success message before a confirmed server transaction.

---

## 5. Information architecture and routes

| Route | Scope | Primary experience |
|---|---|---|
| `/` | Public | Strong product story, short animation/static explainer, CTA: **Try live demo** and **Open workspace**. |
| `/demo` | Public | Deterministic fixture, sample stock and job, interactive **Generate plan**, side-by-side results; no write access. |
| `/login` | Public | Supabase email magic-link or email/password auth (choose one, implement fully). |
| `/app` | Private | Dashboard: jobs, stock availability, latest results, quick action. |
| `/app/materials` | Private | Material cards/table, create/edit forms. |
| `/app/inventory` | Private | Physical stock units and pending remnants; filters and forms. |
| `/app/jobs` | Private | Jobs list with status. |
| `/app/jobs/new` | Private | New job and part-editor table. |
| `/app/jobs/[id]` | Private | Job details, input validation, **Optimize** CTA. |
| `/app/plans/[id]` | Private | Plan comparison, per-sheet SVG diagram, metrics, commit button. |
| `/app/insights` | P1 | Historical summaries based on actual committed plans. |
| `/app/settings` | P1 | Display currency, default kerf, help, export data. |

### Core journeys

**Demo journey:** Landing → Try Demo → Review sample job/stock → Optimize → Baseline vs ReCut OS → Expand one cut diagram → See assumptions & limitations.

**Authenticated journey:** Login → Create material → Add remnant stock → Create job → Optimize → Review/Save → Commit → Confirm resulting stock remnants.

### Empty/error states

- First-run onboarding: "Add your first material" and sample action.
- Empty inventory: planning may still use purchased sheets if material catalog exists.
- Impossible request: name unplaceable parts and explain size/rotation/material constraint.
- Optimizer timeout: show feasible best-so-far if available, labeled heuristic; otherwise provide retry with smaller job.
- Stale stock: user must re-optimize; do not apply partial inventory updates.
- Network/auth/session failure: clear recoverable message with Retry/Sign in.

---

## 6. UX / visual direction

**Design concept:** "Precision workshop meets premium industrial SaaS." The feeling should be disciplined and practical, not playful or gamified.

- **Palette:** dark graphite `#11171B`, near-black `#0B1013`, slate surface `#1C2529`, bone text `#F2F0E9`, subdued text `#A9B4B4`, confident teal `#29B49B`, warm amber `#E8AA65` for material/scrap alerts, red only for errors.
- **Typography:** contemporary sans (e.g. Geist/Inter); tabular numerals for measurements and costs; balanced generous hierarchy.
- **Layout:** desktop 240px navigation rail, global header, metric cards, dense but readable tables, ample whitespace; mobile collapsible navigation and scroll-safe diagrams.
- **Critical screen:** the **Plan Detail** screen is the hero. Left: input/source summary and machine assumptions. Center: large interactive responsive SVG cutting diagram. Right/below: savings and sheet-by-sheet table; baseline comparison.
- **Data viz:** stock source colors must be distinguishable in grayscale; use patterns/labels in addition to color, a legend, keyboard-accessible controls, and accessible textual cut lists.
- **Motion:** restrained, 150–250 ms transitions; respect reduced-motion; do not delay important result rendering.
- **Accessibility:** semantic forms/headings, keyboard control, visible focus, contrast targets of WCAG AA, and text equivalent for SVG diagrams.

### Interface content examples

- Primary CTA: **Generate cutting plan**
- Secondary CTA: **Compare with baseline**
- Stock flag: **Available remnant**, **Available full sheet**, **Pending confirmation**, **Consumed**
- Impact qualifier: **Estimated from these inputs. No physical material has been verified as saved.**
- Failure: **This part cannot fit an available sheet or new standard sheet with its current rotation constraint.**

---

## 7. Technical architecture

```text
Next.js (App Router + TypeScript) deployed on Vercel
 ├─ Public: Landing + self-contained deterministic /demo
 ├─ Authenticated UI (server components + minimal client interactions)
 ├─ Server actions / route handlers
 │   ├─ Zod request validation
 │   ├─ Supabase session identity / authorization
 │   ├─ Load validated job and stock snapshots
 │   ├─ Run bounded pure-TypeScript planner
 │   └─ Persist plan / atomic commit via PostgreSQL RPC
 ├─ lib/domain/*: normalized units, cuts, invariants, metrics
 ├─ lib/optimizer/*: baseline, guillotine planner, comparison, verifier
 └─ Supabase
     ├─ Auth (cookie-based SSR via @supabase/ssr)
     └─ Postgres (materials, stock_items, jobs, job_parts, plans, plan_sheets)
```

**Technology choices:** Next.js App Router, React, TypeScript (strict), Tailwind CSS, shadcn/ui, Lucide, Zod, Supabase Auth + Postgres, `@supabase/ssr`, Vitest, Playwright, Vercel, GitHub Actions for CI. Pick library versions compatible with each other at implementation time; do not assume a version number.

**Why not Python for the MVP?** A TypeScript optimizer in a single Vercel project simplifies build, testing, auth, deployment, and reproducible browser demo. An external OR-Tools service is a future option if high-quality heuristics prove inadequate.

**Security boundary:** No client may dictate an owner ID or trusted cost; on authenticated routes, reload all materials/stock/order data from Supabase by the authenticated owner. Treat generated layouts as untrusted until revalidated server-side prior to commit.

---

## 8. Data model

Use UUID primary keys, `created_at` and `updated_at` UTC timestamps, `user_id` / `owner_id` on every private table, explicit check constraints, indexes for `user_id`, and strict RLS. The following is a contract; the implementation must ship versioned SQL migrations.

### `materials`

| Field | Type | Notes |
|---|---|---|
| `id`, `user_id` | uuid | `user_id` references `auth.users`. |
| `name` | text | e.g. 18mm Birch Plywood. |
| `category` | text | Wood, acrylic, MDF, etc. |
| `thickness_mm` | integer | > 0. |
| `standard_width_mm`, `standard_height_mm` | integer | > 0. |
| `price_per_sheet_minor` | bigint | >= 0, no floating-point currency. |
| `currency_code` | text | e.g. INR; initial single currency per user. |
| `default_kerf_mm` | integer | >= 0; no fractional millimeters in MVP. |
| `grain_axis` | enum | `none`, `x`, `y`; define grain convention in help UI. |
| `min_reusable_width_mm`, `min_reusable_height_mm` | integer | Thresholds; allow rotation consistent with material constraints. |

### `stock_items`

One record = one physical rectangle, **not an aggregate quantity**. At first, input remnants must be rectangular and measured.

| Field | Type | Notes |
|---|---|---|
| `id`, `user_id`, `material_id` | uuid | Owner-checked foreign keys. |
| `label`, `origin` | text / enum | `full_sheet` or `remnant`; source identity preserved. |
| `width_mm`, `height_mm` | integer | > 0. |
| `state` | enum | `available`, `pending_confirmation`, `consumed`. |
| `created_from_plan_id` | nullable uuid | Lineage for generated remnants. |
| `created_from_plan_sheet_id` | nullable uuid | Originating source/cut result. |
| `notes` | text | Optional. |

### `jobs` / `job_parts`

- `jobs`: `id`, `user_id`, `title`, `status` (`draft`, `planned`, `committed`), timestamps.
- `job_parts`: `id`, `user_id`, `job_id`, `material_id`, `label`, `width_mm`, `height_mm`, `quantity`, `allow_rotation`, `required_grain_axis` (`none`, `x`, `y`) + optional notes.
- Grain and rotation rules are a **conservative initial model**: a part's specified axis must match sheet grain once oriented; if unclear, block rather than silently rotate.

### `plans` / `plan_sheets`

- `plans`: `id`, `user_id`, `job_id`, `status` (`draft`, `committed`), `algorithm_version`, `algorithm_seed`, `input_snapshot` JSONB, `baseline_result` JSONB, `optimized_summary` JSONB, `constraints_snapshot` JSONB, timestamp.
- `plan_sheets`: `id`, `user_id`, `plan_id`, `material_id`, `source_stock_id` nullable (null means virtual sheet purchase), `source_type` (`available_remnant`, `available_full_sheet`, `new_purchase`), width/height, `placements` JSONB, `cut_tree` JSONB, `unallocated_regions` JSONB, `estimated_new_sheet_cost_minor` bigint.
- `commit_plan` implemented as a **PostgreSQL transaction/RPC**, locking selected available stock units, asserting exclusive availability, marking them consumed, creating pending-confirmation remnant records, and marking the plan committed. Distinct allocations must reference unique physical stock IDs; reject duplicates.
- Denormalized `user_id` on child rows requires consistency via **composite foreign keys** `(parent_id, user_id)` referencing `(id, user_id)` or equivalent validated DB constraints to stop cross-owner references.

### Data policies and security requirements

- Enable RLS **for every exposed app table**; revoke unnecessary `anon` and `authenticated` grants and grant only needed actions; use explicit operation-specific owner policies using `auth.uid()`.
- A malicious request with another user's `job_id`, `stock_id`, or `material_id` must fail at authorization/DB constraint layers.
- No service-role/secret key in browser code or `NEXT_PUBLIC_*` variables; use project **publishable key** only for user-scoped public client.
- Test authenticated owner, authenticated other user, and unauthenticated user for SELECT/INSERT/UPDATE/DELETE on every table.
- Plans must not be affected by changing part sizes/prices later: snapshots stay immutable.
- Make destructive production DB schema operations human-approved; no automatic database reset.

---

## 9. Geometry and optimization specification (most important section)

### 9.1 Data units and terminology

All geometry uses **positive integer millimeters**. Areas use `mm²` as safe integer arithmetic (validate upper bounds so results remain below `Number.MAX_SAFE_INTEGER`). Currency uses integer minor units.

- **Stock unit**: one rectangular physical existing sheet/remnant OR one virtual purchased standard sheet.
- **Part instance**: expanded single part of quantity `q` with unique part instance ID.
- **Kerf**: material consumed by each modeled saw cut (a strip of width `kerf_mm`). Do **not** merely draw lines and ignore width.
- **Guillotine cut**: a straight, edge-to-edge cut across the **current sub-rectangle**, not an arbitrary cut across the full original sheet.
- **Recovered remnant**: residual rectangle exceeding reusable-size thresholds, marked **pending confirmation** until physically verified.
- **Unusable scrap**: residual region smaller than the configured thresholds, plus kerf loss if reporting total waste.

### 9.2 Hard constraints

1. Every requested part instance is placed **exactly once** or the plan is explicitly infeasible.
2. Material category + thickness must match the stock material ID exactly.
3. Every placed part is fully inside its source stock bounding box.
4. Parts and kerf strips never overlap, and all coordinates are nonnegative integers.
5. If rotation is disabled, use the part's original orientation; grain restrictions can disable otherwise permitted rotations.
6. All cuts obey the returned **guillotine cut tree** and kerf; record cut direction and position.
7. A physical stock item may be allocated to a plan only once; using it in multiple committed plans is forbidden.
8. Every virtual new sheet has the standard dimensions/cost of the selected material.
9. Offcuts smaller than minimum reusable thresholds are not returned as confirmed usable stock.
10. If part or job cannot be feasibly packed, return a **typed error** describing the unmet constraint; never silently drop it.

### 9.3 Recommended MVP approach

Implement a deterministic **guillotine-recursive free-rectangle heuristic**, then optionally run multiple seeded orderings within a strictly bounded computation budget.

**Baseline:** Pack the exact same part instances using only **new standard sheets** using a simple, deterministic first-fit decreasing guillotine strategy. Enforce **identical** kerf, grain, rotation, and part constraints. This baseline represents a clear comparator, not a claim about what every workshop currently does.

**ReCut heuristic:**

1. Normalize inputs and group by material.
2. Expand quantities to instances and sort with deterministic tie-breaker (e.g., area descending, longest side, stable ID).
3. Build candidate stock list prioritizing **available remnants**, then **owned full sheets**, then virtual **purchased standard sheets**. Consider candidate fit, potential future reuse, cost, and fragmentation—not source type alone if it would make the job infeasible.
4. For each candidate part, evaluate both allowed orientations and both **guillotine split directions**. A split into a residual rectangle is legal only when dimensions leave room for actual kerf; exact fit requires no cut on that boundary.
5. Choose a deterministic placement score; prefer zero added purchases, then lower cost, then less unrecoverable scrap/fragmentation, then stable tie-breakers.
6. Track a **cut tree** of all operations and residual rectangles. Leftover usable rectangles inherit the original material and become candidate pending remnants after commit.
7. Optionally try several seeded permutations (e.g., 8–20) with the same bounded input/time budget and choose the best **validated** feasible result.
8. Verify every result independently of the placement heuristic before saving or showing it as feasible.

**Important truth:** A remnant-first heuristic might sometimes buy more sheets than a smarter global optimum. If the computed plan is worse than baseline in a cost metric, show that transparently; do not clamp savings to a positive number or hide it.

### 9.4 Objective function and ranking

Use **lexicographic ordering** to avoid ambiguous weights:

1. Feasible completion of *all* requested parts.
2. Minimize `new_sheet_purchase_cost_minor`.
3. Minimize unusable residual scrap + kerf loss area.
4. Prefer fewer cut operations (production simplicity).
5. Prefer fewer opened existing stock units, then stable deterministic tie-breaks.

Do not count historical remnant acquisition price as a new purchase cost. Optionally disclose an economic opportunity-cost interpretation separately, but keep MVP comparisons simple and consistent.

### 9.5 Metrics and accounting

For each plan report:

- `part_area_mm2`: sum of required part rectangle areas; constant across feasible plans.
- `opened_stock_area_mm2`: area of all sheets/remnants opened by plan, including existing and purchased.
- `new_sheet_count`, `new_sheet_purchase_cost_minor`: count/cost of *virtual purchased* sheet units.
- `available_remnant_units_used`: count and original area of input remnant stock consumed.
- `recoverable_remnant_area_mm2`: sum of qualifying residual rectangles (pending physical confirmation).
- `unusable_scrap_area_mm2`: below-threshold residual offcut area; separate from saw loss.
- `kerf_loss_area_mm2`: sum of non-overlapping cut strip areas measured by the cut tree.
- `used_material_utilization_pct = 100 * part_area / opened_stock_area` (note: can be misleading when existing small remnants are counted; explain denominator).
- `cost_delta_minor = baseline_new_purchase_cost - recut_new_purchase_cost`.
- `purchase_reduction_pct = 100 * cost_delta / baseline_cost` when baseline cost > 0; otherwise show N/A, not divide by zero.

**Material conservation invariant, per opened stock unit:** `initial_area = part_area + recoverable_residual_area + unrecoverable_residual_area + kerf_loss_area`. Define any excluded thin strips consistently in the tree, so all area is accounted for exactly once.

A **reduced purchase** is not identical to **waste avoided** or **carbon avoided**. The UI must label these appropriately and use no environmental conversion without documented sourced factors and assumptions.

### 9.6 Output contract

The optimizer returns:

```ts
type PlanResult = {
  algorithmVersion: string;
  seed: number;
  status: 'feasible' | 'infeasible' | 'timeout';
  explanation?: string;
  sheets: Array<{
    materialId: string;
    sourceStockId?: string; // absent = newly purchased sheet
    sourceType: 'available_remnant' | 'available_full_sheet' | 'new_purchase';
    widthMm: number;
    heightMm: number;
    placements: Array<{
      partInstanceId: string; xMm: number; yMm: number;
      widthMm: number; heightMm: number; rotated: boolean;
    }>;
    cutTree: unknown; // replace with discriminated, typed recursive cut nodes
    residuals: Array<{ xMm: number; yMm: number; widthMm: number; heightMm: number; reusable: boolean }>;
  }>;
  metrics: Record<string, number | null>;
  warnings: string[];
};
```

Replace the illustrative `unknown` and loose metrics record with strict TypeScript schemas before implementing. Persist snapshots and tested typed outputs, **never arbitrary unvalidated JSON**.

---

## 10. API and business logic contracts

Favor authenticated Next.js server actions for simple CRUD, with explicit handlers when suitable for large payloads. All are server-authorized and validated. Route names are examples, not a mandate to expose everything via HTTP:

| Operation | Input | Output |
|---|---|---|
| `createMaterial` | validated catalog data | owned material |
| `createStockItem` | material ID, size, origin | available stock item |
| `createJob` / `upsertJobParts` | job + part rows | owned job and parts |
| `previewOptimization` | job ID OR demo fixture | baseline + proposed results + warnings; no inventory mutation |
| `savePlan` | job ID, validated snapshot/result | persisted draft with ownership check |
| `commitPlan` | saved plan ID, expected stock IDs/versions | committed plan + pending remnants or conflict |
| `confirmRemnant` | remnant ID, measured dimensions | available remnant or rejected/adjusted state |

**Validation:** Zod on inputs and result shapes; bound job sizes and request time. Never trust arbitrary client-provided source stock IDs, prices, or owner identifiers. Load the canonical DB snapshot on the server before optimizing. Record solver version and strategy so results are reproducible.

### Auth strategy

Use Supabase Auth with official SSR cookie integration (`@supabase/ssr`); implement refresh/session handling as recommended in current Next.js/Supabase docs. Protect private routes and every server action; do not assume hiding buttons is authorization. Do not use an admin client to do user CRUD when RLS-aware clients suffice.

---

## 11. Testing and verification

### Unit tests (Vitest)

- Input validation: zero/negative/fractional dimensions, overflow area, huge quantity, invalid currency, missing material.
- Geometry: exact fit; cut with kerf; no-room-for-kerf; single rotated fit; rotation prohibited; grain mismatch; unplaceable part.
- Cut tree: replay cuts against parent rectangles; cuts cannot extend beyond the current sub-rectangle; kerf area accounted once.
- Invariants: parts exactly once; no overlap; distinct used stock IDs; conservation identity; valid metrics; no negative area.
- Determinism: same normalized input, seed, version → same output (excluding time metadata).
- Baseline equivalence: identical part demand and constraints; only stock sourcing differs.
- Edge cases: zero available remnants, many small remnants, stock too small, large quantity within bound, multiple materials.
- Atomic commit: stale/consumed physical stock → rollback and conflict; never double-consume.

### Integration tests

- Supabase RLS tests for owner vs other authenticated user vs anonymous access.
- Correct user-scoped CRUD, snapshot immutability, auth redirect, session expiry.
- Server rejects malformed optimizer plans even when payload bypasses browser validation.

### End-to-end tests (Playwright)

1. Public guest opens `/demo`, runs plan, views baseline comparison and diagram.
2. Authenticated user creates a material, stock item, job, saves a draft, and commits once.
3. Attempt to commit the same stock from a second stale plan → meaningful conflict.
4. Mobile viewport can use forms, see diagrams, and navigate.
5. Empty/invalid/error states are accessible and recoverable.

### Benchmark methodology

Store version-controlled representative datasets in `fixtures/`. For each fixture:

1. Verify **both** baseline and optimized results with the same independent geometry verifier.
2. Run with fixed seeds and record run time/hardware and algorithm version.
3. Compare sheet purchase count, cost, actual opened inventory, usable residuals, scrap, and cut count.
4. Include at least one fixture where no savings are achieved; be truthful about limitations.
5. Never describe synthetic simulation as a validated physical deployment.

---

## 12. Demo scenario and storytelling

### Suggested realistic fixture (illustrative, not claimed as a real customer)

- Material: 18 mm plywood; standard sheet `2440 × 1220 mm`, kerf `3 mm`, price `₹1,800` each.
- Existing available inventory: three rectangular offcuts, each individually labeled and with plausible dimensions (exact sizes recorded in `fixtures/`).
- Job: 8–20 rectangular pieces with quantity, orientation, and material requirements.
- Compare baseline new-sheet-only vs ReCut OS using **the same parts and constraints**.
- The application must show actual computed results; **do not hard-code savings** into the dashboard or demo video.

### Judge-ready 2:40 walkthrough

| Time | Scene | Evidence |
|---|---|---|
| 0:00–0:20 | Explain forgotten reusable offcuts | Clear practical problem, no unsourced numerical claims. |
| 0:20–0:40 | Show remnant inventory | Real item dimensions, status, material IDs. |
| 0:40–1:20 | Create/select job and optimize | A genuine algorithm executes, state changes naturally. |
| 1:20–2:00 | Show SVG layouts and cut sequence | Explain kerf, orientation, feasibility validation. |
| 2:00–2:25 | Show baseline and impact calculations | Absolute differences, assumptions, caveats. |
| 2:25–2:40 | Explain path to workshop adoption | Practical next steps, honest limitations. |

### Submission package

Public production URL, GitHub repository with history, README (setup, architecture, optimizer explanation, assumptions, demo credentials or public fixture, testing commands), demo video within official duration limits, and concise Devpost narrative. Verify the official requirements and exact cutoff before submission.

---

## 13. Delivery phases and release gates

**Phase 0 — foundations:** Scaffold Next.js, strict TS, UI tokens, test harness, project documentation, CI, Supabase project and env template. **Gate:** `lint`, `typecheck`, `test`, `build` pass.

**Phase 1 — domain correctness:** Implement geometry data types, splitting cut tree, independent verifier, baseline, fixtures. **Gate:** invariants/property cases pass locally. Do not build fancy dashboards before this.

**Phase 2 — ReCut optimizer:** Remnant-first selection, stable scoring, optional bounded multi-start, explainable outputs, metrics. **Gate:** fixtures reproduce and every returned feasible plan verifies.

**Phase 3 — full-stack persistence:** SQL migrations, Supabase SSR auth, RLS, materials/inventory/jobs, saved plans, atomic commit. **Gate:** CRUD and adversarial RLS tests pass.

**Phase 4 — presentation:** High-quality public demo, dashboard, diagram explorer, before/after comparisons, responsive accessibility, print support if time. **Gate:** guest demo works without DB credentials and core flow feels polished.

**Phase 5 — deployment and evidence:** GitHub CI, Vercel production/preview environments, production smoke test, performance/benchmark report, demo recording. **Gate:** deployed link runs from an incognito browser; credentials are absent from Git; README is reproducible.

### Definition of done for MVP

- [ ] All P0 journeys demonstrated on production Vercel URL.
- [ ] Optimized plan and baseline produced by actual executable code.
- [ ] Independent verifier passes every feasible sheet/cut tree.
- [ ] All reported metrics computed from the returned plan; no fabricated savings.
- [ ] Two-user RLS tests and stale-plan commit test pass.
- [ ] Demo is public and requires no sign-up.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- [ ] Public repository contains `.env.example` but no real secrets.
- [ ] App, repo, and demo video are submitted before cutoff.

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Incorrect cut feasibility | Implement split tree + replay verifier + conservation tests; limit to guillotine cuts for MVP. |
| Heuristic delivers poor improvement | Multiple seeded orderings; transparent baseline; show genuine improvement only where measured. |
| Stock double-spend when two plans commit | Transactional row locking, state guards, unique consumption, conflict error. |
| RLS misses a child foreign key | Composite owner-safe constraints and per-operation RLS policy tests. |
| Solver exceeds Vercel execution constraints | Bound input size and search iterations; return a clear timeout; defer background queues. |
| No real-world sample data | Use labeled synthetic fixture, document assumptions, and seek at least one workshop feedback interview. |
| Too much scope | Freeze MVP; mark P1 as optional; optimizer validity and one-click public demo always win prioritization. |
| Sustainability claim lacks evidence | Use purchase/scrap estimates separately; never invent carbon factors or physical verification. |

---

## 15. Future roadmap, intentionally excluded from MVP

- Batch jobs over a week and dynamic inventory reservations.
- Polygon nesting and third-party CNC exports with machine-specific validation.
- Barcode/QR inventory scanning; phone camera with calibration for measuring remnants.
- Local supplier pricing, cut-machine constraints, and mixed-stock cost models.
- Verified workshop pilots tracking real physical waste and replenishment spend.

---

## 16. Reference documentation

- Google Antigravity Skills: https://antigravity.google/docs/skills
- Google Antigravity Rules: https://antigravity.google/docs/rules/
- Supabase Next.js Auth: https://supabase.com/docs/guides/auth/server-side
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Git Integration: https://vercel.com/docs/git
- Next.js App Router: https://nextjs.org/docs/app
- Hackathon portal: https://arbiter-hacks-v1.devpost.com/

**The PRD is a product-and-engineering contract, not proof that the application has been implemented.** All targets and baseline scenarios are plans to verify during development.
