---
name: recut-geometry
description: Implements and independently verifies kerf-aware, rectangular guillotine sheet cutting layouts, cut trees, rotation and grain constraints, and non-overlapping part placements. Use for ReCut OS optimization engine work.
---

# Goal
Build the most important defensible ReCut OS functionality: a **physically feasible** cutting plan, not merely a visually attractive bin-packing picture.

## Algorithm guidance
1. Read PRD section 9 and `recut-domain-model`; do not start with the UI.
2. Model rectangles in integer millimeters, with a known local origin and dimensions. Part instances require unique IDs.
3. Represent a cut tree recursively with two kinds of nodes: `leaf` (`part` or `residual`) and `split` (`vertical`/`horizontal`, cut position, kerf width, and two child regions). Each split is across its **current sub-rectangle**.
4. To place a part inside a free rectangle, evaluate allowed orientation and vertical-first/horizontal-first choices. If residual width/height is nonzero, the cut consumes `kerfMm`, and residual must remain nonnegative; for a zero residual, no cut is needed.
5. Generate a legal rectangular subdivision tree whose leaves partition the original stock into part rectangles, residual rectangles, and kerf strips. Preserve true cut ordering.
6. Rank feasible candidates deterministically with stable tie-breakers, respecting entire-job source selection rules.
7. Build an independent verifier by **replaying the cut tree from the original stock dimensions**, checking each parent-child coordinate/area relationship, all kerf strips, and leaf geometry; never simply trust the planner's placement list.
8. Cross-check leaf parts against requested part instance IDs, dimensions, rotation/grain compatibility, and material ID. All parts must appear exactly once. Check stock source uniqueness.
9. Cross-check `initial_area == part_area + recoverable_residual + unrecoverable_residual + kerf_loss` on every used stock item.
10. Return typed infeasibility (part too large, disallowed rotation, no valid split, search exhausted) instead of returning partial success.

## Tests that must pass
- Exact fit with zero cuts and no kerf.
- Part leaving a residual exactly `kerfMm` wide is legal only if cut geometry remains feasible; no negative region.
- Part leaving less than kerf cannot be separated by the modeled saw cut.
- Two rectangles that fit by area but overlap or require a non-guillotine cut fail verification.
- Grain locked / rotation forbidden; material mismatch; duplicate part ID; missing part; out-of-bounds coordinate.
- A complex cut tree conserves exact area; invalid cut order is rejected.

## Constraints
Do not promise global optimality. Keep bounded run time and deterministic seeds. Do not label a layout as 'cut-ready' before a separate verifier returns success. A machine operator must still verify shop-specific machine constraints.
