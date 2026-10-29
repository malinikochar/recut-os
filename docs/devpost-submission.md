# ReCut OS — Arbiter Hacks Submission & Demo Guide

## Live Links
- **Production Application:** https://recut-os.vercel.app
- **One-Click Public Demo Sandbox (No Login Required):** https://recut-os.vercel.app/demo
- **GitHub Repository:** https://github.com/malinikochar/recut-os

---

## Elevator Pitch
Small woodworking, acrylic, and sheet-goods fabrication shops accumulate valuable rectangular offcuts that sit unused on racks because checking kerf-aware guillotine feasibility by hand takes longer than ordering a new standard sheet. **ReCut OS** tracks physical remnants as individual owned rectangles, computes executable **2D binary guillotine saw trees** with exact blade-kerf subtraction, verifies every cut independently to `1 mm²` area conservation, compares results transparently against a deterministic new-sheet-only baseline, and commits approved layouts through row-locked PostgreSQL transactions.

---

## What Makes ReCut OS Trustworthy Industrial Software

1. **Real Saw Geometry, Not Free-Form Rectangles**
   - Every cutting layout in [`lib/optimizer/guillotine.ts`](../lib/optimizer/guillotine.ts) is built as a recursive edge-to-edge `CutNode` binary split tree (`vertical` rip or `horizontal` crosscut) removing exact integer millimeter blade kerf (`kerfMm`) on every cut.
   - Respects material envelope, 90° rotation permissions, and conservative grain-axis alignment (`none`, `x` along sheet width, `y` along sheet height).
2. **Independent Cut-Tree Verifier Gate**
   - [`lib/optimizer/verify.ts`](../lib/optimizer/verify.ts) replays every candidate plan from root stock dimensions before display or persistence—checking split bounds, kerf strips, pairwise non-overlap, 1-to-1 part bijection, and exact area conservation:
     $$\sum A_{\text{parts}} + \sum A_{\text{recoverable}} + \sum A_{\text{scrap}} + \sum A_{\text{kerf}} = \sum A_{\text{opened}}$$
3. **Honest Baseline & Accounting**
   - Compares ReCut OS against a deterministic **New-Sheet-Only First-Fit Decreasing (FFD) Guillotine** baseline ([`lib/optimizer/baseline.ts`](../lib/optimizer/baseline.ts)) under identical part quantities, kerf, grain, and rotation rules.
   - Explicitly separates **modeled new-sheet purchase spend avoided** from **physical material loss**: existing remnants carry zero new purchase cost (sunk cost), scenarios with empty racks or unusable remnants report `0%` delta honestly, and oversized parts fail explicitly with structured diagnostics (`[part_exceeds_stock]`).
4. **Owner-Isolated RLS & Row-Locked Atomic Commits**
   - Protected by `@supabase/ssr` cookie sessions, forced PostgreSQL Row Level Security across all 6 tables, and composite `(parent_id, user_id)` foreign keys.
   - [`public.commit_plan`](../supabase/migrations/20261030000002_commit_plan_conflict_errcode.sql) acquires `FOR UPDATE` row locks on allocated `stock_items` in deterministic UUID order, prevents double-spending stale remnants across concurrent draft plans, and stages qualifying offcuts as `pending_confirmation` until physically measured on the shop floor.

---

## 2:40 Video Script & Shot List

| Time | Screen | Narration Beat |
|---|---|---|
| `0:00 – 0:25` | `/` Landing Page | Show how usable plywood and acrylic offcuts pile up because manual kerf + grain layout checking is slow, pushing shops to buy fresh sheets unnecessarily. |
| `0:25 – 1:15` | `/demo` Public Sandbox | Click **Try the live demo**. Show `sample-workshop-v1`: all 10 cabinet pieces pack into 3 existing remnants (`0` new sheets vs `1` standard sheet / `₹1,800` in the FFD baseline). Switch between **ReCut OS Plan** and **Compare New-Sheet Baseline** SVG diagrams, inspect the numbered rip/crosscut table, then select `impossible-oversized-part-v1` to demonstrate explicit `[part_exceeds_stock]` infeasibility reporting. |
| `1:15 – 2:10` | `/app` Authenticated Console | Sign into an RLS-isolated workshop, open a job against physical rack inventory, click **Generate Cutting Plan**, and click **Commit Cutting Plan**. Show source remnants transitioning to `consumed` and recoverable leftovers staged as `pending_confirmation` on `/app/inventory` for shop measurement. |
| `2:10 – 2:40` | Stale Plan & Benchmarks | Attempt to commit a stale draft plan referencing the already-consumed remnant—show PostgreSQL blocking the double-spend atomically with a 1-click re-optimize prompt. Close on `docs/benchmarks.md` and honest limitations (heuristic search, orthogonal rectangular guillotine cuts only). |
