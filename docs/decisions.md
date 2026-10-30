# ReCut OS — Architectural & Engineering Decisions

This log records explicit engineering and product decisions made while implementing `PRD.md`, resolving ambiguities conservatively per `AGENTS.md`.

---

## ADR-001: Integer Geometry, Safe Area Bounds, and Minor Currency Units
- **Date:** 2026-10-30
- **Context:** Floating-point arithmetic introduces rounding drift that breaks area-conservation checks and financial comparisons. JavaScript `number` integers are exact up to `Number.MAX_SAFE_INTEGER` (`9,007,199,254,740,991`).
- **Decision:**
  - All geometric lengths (`widthMm`, `heightMm`, `thicknessMm`, `kerfMm`, coordinates) must be integers (`Number.isSafeInteger`).
  - Maximum sheet/part dimension is bounded to `100,000 mm` (100 m), maximum kerf to `50 mm`, maximum thickness to `500 mm`, maximum part row quantity to `50`, and maximum expanded part instances per job to `100` (matching PRD Section 4 US-06). Even `100` sheets of `100,000 × 100,000 mm` equals `10^12 mm²`, more than `9,000×` below `Number.MAX_SAFE_INTEGER`.
  - Prices and costs are non-negative safe integers in minor currency units (e.g., paise for `INR`, cents for `USD`), bounded per sheet at `100,000,000` minor units so job totals never overflow JS safe integers or PostgreSQL `bigint`.
- **Consequences:** Zero floating-point drift in geometry or cost deltas; exact `1 mm²` conservation checks.

---

## ADR-002: Conservative Grain Axis and Rotation Compatibility
- **Date:** 2026-10-30
- **Context:** `materials.grain_axis` (`none | x | y`) and `job_parts.required_grain_axis` (`none | x | y`) interact with `job_parts.allow_rotation`. PRD Section 8 states: *"a part's specified axis must match sheet grain once oriented; if unclear, block rather than silently rotate."*
- **Convention:**
  - On stock/sheets: `x` means grain runs parallel to `widthMm` (horizontal axis in plan view); `y` means grain runs parallel to `heightMm` (vertical axis in plan view); `none` means isotropic/ungrained sheet (e.g., MDF, acrylic).
  - On parts (in unrotated orientation): `x` means grain must run parallel to the part's `widthMm`; `y` means grain must run parallel to the part's `heightMm`; `none` means the part has no grain constraint.
- **Decision:**
  1. If `part.requiredGrainAxis !== 'none'` and `material.grainAxis === 'none'`, placement is **rejected** (`grain_mismatch`) because an ungrained sheet cannot satisfy an explicit grain requirement.
  2. Unrotated orientation (`rotated = false`) is valid iff `part.requiredGrainAxis === 'none'` OR `part.requiredGrainAxis === material.grainAxis`.
  3. Rotated 90° orientation (`rotated = true`) swaps the part's `widthMm` and `heightMm` axes relative to the sheet, so it is valid iff `part.allowRotation === true` AND (`part.requiredGrainAxis === 'none'` OR `(part.requiredGrainAxis === 'x' && material.grainAxis === 'y')` OR `(part.requiredGrainAxis === 'y' && material.grainAxis === 'x')`).
  4. In the job creation UI, selecting a grained material defaults `requiredGrainAxis` to the material's `grainAxis` so operators get grain-aligned parts unless they explicitly choose `none`.
- **Consequences:** Grain restrictions can forbid unrotated placement (requiring 90° rotation if permitted) or forbid rotation even when `allowRotation` is `true`. Ambiguous cases fail explicitly with structured diagnostics.

---

## ADR-003: Constructive Guillotine Cut Tree and Kerf-Exact Edge Semantics
- **Date:** 2026-10-30
- **Context:** Free-form 2D rectangle bin packing can produce pinwheel layouts that a panel saw or table saw cannot execute with straight edge-to-edge cuts. Furthermore, saw kerf removes physical strip width (`kerfMm`) on every actual cut.
- **Decision:**
  - Layouts are constructed exclusively as recursive binary `CutNode` trees rooted at `(0, 0, sheet.widthMm, sheet.heightMm)`:
    - `PartLeafNode`: placed part instance occupying the entire leaf sub-rectangle.
    - `ResidualLeafNode`: unallocated rectangular region classified as `reusable` or unusable scrap.
    - `GuillotineSplitNode`: straight edge-to-edge cut (`vertical` or `horizontal`) across its current sub-rectangle at `cutOffsetMm > 0`, removing a kerf rectangle of thickness `kerfMm`, producing `first` child and `second` child (`CutNode | null`).
  - **Exact-fit vs cut rule along dimension `D` for part size `d` and kerf `k`:**
    - If `d === D`: **exact fit** — zero cut is performed along that axis (`0` kerf loss).
    - If `d + k < D`: **standard guillotine split** — `first` gets `d`, kerf consumes `k`, and `second` gets `D - d - k > 0`.
    - If `d + k === D` and `k > 0`: **edge-trim split** — `first` gets `d`, the saw cut removes the exact remaining `k` margin as kerf (`kerfAreaMm2 = k * orthogonalSpan`), and `second` is `null` (`0 mm` residual, nonnegative).
    - If `D - k < d < D`: **illegal** — insufficient margin for the blade kerf; placement in that orientation is rejected.
  - **Reusable remnant threshold:** A `ResidualLeafNode` `(w, h)` is marked `reusable = true` iff:
    - When `material.grainAxis === 'none'`: `(w >= minW && h >= minH) || (h >= minW && w >= minH)`.
    - When `material.grainAxis !== 'none'`: `w >= minW && h >= minH` (preserving grain axis orientation).
  - **Independent Verifier (`lib/optimizer/verify.ts`):** Authored independently of the packer. Replays every `CutNode` from root stock dimensions, verifies sub-rectangle partition bounds, kerf strip geometry, pairwise non-overlap across all parts/residuals/kerfs, exact `1 mm²` area conservation per sheet, part bijection, stock uniqueness, and rotation/grain rules. No plan is shown as feasible or persisted unless `verifyPlan` passes with zero errors.

---

## ADR-004: Multi-Start Remnant-First Optimizer & Lexicographic Ranking
- **Date:** 2026-10-30
- **Context:** Single-pass greedy packing can miss remnant combinations that avoid buying a new sheet (or can needlessly consume extra remnants when an already-opened sheet has residual space).
- **Decision:**
  - **Baseline (`lib/optimizer/baseline.ts`):** Deterministic New-Sheet-Only First-Fit Decreasing (FFD) Guillotine algorithm using identical demand, kerf, rotation, and grain rules, sourcing exclusively from virtual new standard sheets.
  - **ReCut Optimizer (`lib/optimizer/guillotine.ts`):** Deterministic bounded multi-start search (default budget `<= 1500 ms`, fixed PRNG seed) combining:
    1. Multiple deterministic sort orders (`area DESC`, `maxSide DESC`, `perimeter DESC`, `width DESC`, `height DESC`) plus seeded permutations across split-axis/free-rect heuristics (`BestAreaFit + ShorterLeftoverAxis`, `BestShortSideFit + LongerLeftoverAxis`, `BestLongSideFit`, etc.) and remnant ordering modes (tightest-remnant-first vs largest-remnant-first).
    2. Post-pack **stock consolidation pass**: attempts to repack parts from opened existing stock into other already-opened sheets if doing so reduces opened existing stock count without increasing `new_sheet_purchase_cost_minor` or total waste.
  - All candidate plans are verified by `verifyPlan` and ranked strictly by PRD Section 9.4 lexicographic objective:
    1. Feasible completion of all parts.
    2. Minimum `new_sheet_purchase_cost_minor`.
    3. Minimum `unusable_scrap_area_mm2 + kerf_loss_area_mm2`.
    4. Minimum total `cutCount`.
    5. Minimum `openedExistingStockCount`, followed by deterministic tie-breakers.
  - Savings metrics allow zero or negative deltas transparently; no clamping or hardcoded claims.

---

## ADR-005: Authentication, Owner-Safe Foreign Keys, and Atomic Plan Commit
- **Date:** 2026-10-30
- **Context:** Authenticated workshop data must enforce strict tenant isolation via Supabase RLS and prevent double-spending physical remnants under concurrent commits.
- **Decision:**
  - **Auth:** Implement Supabase Email + Password Sign In & Sign Up via `@supabase/ssr` cookie-backed sessions and Next.js 16 `proxy.ts` (`supabase.auth.getClaims()`), plus `/auth/callback` route handler for email confirmation/redirect flows. Public `/` and `/demo` never require auth or Supabase writes.
  - **Database Isolation:** Every table (`materials`, `stock_items`, `jobs`, `job_parts`, `plans`, `plan_sheets`) carries `user_id uuid NOT NULL REFERENCES auth.users(id)` with `UNIQUE (id, user_id)` on parent tables and composite `(parent_id, user_id)` foreign keys on child tables so cross-owner references are impossible at the schema constraint level in addition to per-operation `TO authenticated` RLS policies (`(select auth.uid()) = user_id`).
  - **Stock Envelope Check:** Physical stock items must have positive integer dimensions that fit within their material's standard sheet envelope (allowing 90° swap only if `grain_axis = 'none'`).
  - **Atomic Commit (`commit_plan` RPC):** PostgreSQL `SECURITY INVOKER` transactional function that verifies `(select auth.uid())` owns the draft plan, acquires `FOR UPDATE` row locks on all referenced `stock_items` in deterministic UUID order (preventing deadlocks), asserts every physical stock item is still `state = 'available'`, transitions them to `consumed`, inserts reusable residuals as `state = 'pending_confirmation'` with `created_from_plan_id` / `created_from_plan_sheet_id` lineage, and marks both the `plan` and `job` as `committed`. Business-level `STOCK_CONFLICT` exceptions use SQLSTATE `P0001` (`raise_exception`, HTTP 400 in PostgREST) rather than `40001` (`serialization_failure`, HTTP 503), ensuring `@supabase/postgrest-js` surfaces stale-stock conflicts immediately instead of entering HTTP 503 retry backoff. Any conflict rolls back the entire transaction atomically.

---

## ADR-006: Semantic Dual-Theme System (Light Default + Dark Mode)
- **Date:** 2026-10-31
- **Context:** Operators use ReCut OS both under bright sunlit shop-floor lighting (where crisp drafting-paper light mode offers superior legibility and print fidelity) and in low-glare evening planning environments (dark CAD mode). Hardcoded hex colors fail WCAG AA contrast if inverted naively.
- **Decision:**
  - **Default Theme (`light`):** `<html data-theme="light">` is the deterministic SSR and first-visit default (`DEFAULT_THEME = 'light'`). A minimal synchronous `<head>` script checks `localStorage.getItem('recut-theme')` before first paint so returning users who selected `'dark'` experience zero flash of wrong theme, while first-time/incognito visitors always land in `'light'`.
  - **Semantic CSS Custom Properties (`app/globals.css` + `@theme inline`):** All UI primitives, pages, forms, and interactive SVG cutting diagrams consume semantic tokens (`--bg-page`, `--bg-shell`, `--bg-card`, `--text-primary`, `--accent-primary`, `--accent-text`, `--amber-text`, `--danger-text`, and `--svg-*`), tuned independently for WCAG 2.2 AA contrast in both Light and Dark modes, with `@media print` forcing crisp white paper tokens regardless of active screen theme.
  - **Hydration-Safe External Store (`components/theme/theme-provider.tsx`):** Uses React 19 `useSyncExternalStore` without `useEffect`/`setState` side effects or third-party theme packages, keeping desktop and mobile `ThemeToggle` controls synchronized across routes and browser tabs.
