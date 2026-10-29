---
name: recut-impact-benchmark
description: Builds trustworthy baseline comparisons and waste/purchase accounting for ReCut OS, including new-sheet-only baseline, used remnant inventory, cut losses, reproducible fixtures, and honest measurable claims.
---

# Goal
Prove whether the actual ReCut OS optimizer reduces new purchases on the specified scenario while reporting other physical quantities without conflating them.

## Procedure
1. Read PRD sections 3, 9.4–9.5, 11–12 and `fixtures/sample-workshop.json`.
2. Implement deterministic new-sheet-only *first-fit decreasing guillotine* baseline with the **same** part list, material, kerf, grain, and rotation constraints as the optimized plan.
3. Implement cost-first remnant reuse strategy with a stable ordering and optional bounded multi-start seeds. Do not call the heuristic 'globally optimal'.
4. Require the **independent geometry verifier** to approve each plan, baseline and optimized, before calculating comparison metrics.
5. Use exact integer currency minor units. Report counts and absolute difference first. Percentage is null/"N/A" if baseline purchase cost = 0.
6. Separate part used area, opened input area, reused remnant area, recoverable residual area, below-threshold scrap area, and kerf loss area. Check area conservation.
7. Compare apples-to-apples *new purchase spend*; existing remnant cost is already sunk and must not be double-charged. Label this accounting policy.
8. Create version-controlled benchmark cases: no inventory, abundant good remnants, poor remnants, impossible part, zero kerf, rotation disabled, and no savings achieved.
9. Save benchmark input hash, algorithm version, seed, run time, baseline metrics, optimized metrics, and test environment to `docs/benchmarks.md` after actually running a script.
10. Show caveat clearly: reductions are **modeled purchase requirements**, not verified reductions of physical waste or emissions.

## Quality gates
- No fabricated percentages, no manually edited favorable metrics, no chart with different denominator/constraints.
- A negative cost delta must be allowed and explained.
- A user can click through from high-level metrics to the actual cutting plan and input sources.
- The UI stays consistent with data returned by the actual optimizer; no separate hardcoded demo math.
