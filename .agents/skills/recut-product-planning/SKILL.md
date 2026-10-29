---
name: recut-product-planning
description: Turns the ReCut OS PRD into scoped implementation milestones, acceptance criteria, and documented engineering decisions. Use when planning architecture, resolving scope ambiguity, or sequencing a build.
---

# Goal
Translate `PRD.md` into small, verifiable implementation increments without losing the hackathon differentiator: remnant-first reuse plus validated 2D cutting plans.

## Procedure
1. Read `PRD.md`, `AGENTS.md`, and the current `IMPLEMENTATION_PLAN.md`. Inspect code before editing.
2. Map each P0 user story to UI route, domain functions, persistence, and tests.
3. Order work by risk: input contracts → physical geometry correctness → baseline/metrics → auth/RLS → complete UI → deploy/demo.
4. Identify external dependencies (Supabase credentials, Vercel project, GitHub repository) without pretending they exist.
5. Break each step into a verifiable vertical slice: input → behavior → observable result → tests.
6. Add decisions to `docs/decisions.md` with rationale, tradeoffs, impact on scope, and date.
7. Update checklist items only after work has been performed and verified.

## Acceptance criteria
- Every P0 feature has a concrete acceptance test and dependency.
- P1 functionality cannot block release of P0.
- No speculative customer/sustainability claims or placeholder backend represented as functional.
- If a feature cannot be implemented robustly, simplify the scope transparently instead of faking completion.

## Stop conditions
If a plan requires credentials, destructive cloud changes, new paid services, or altering the required stack, describe the issue and ask for appropriate authorization; continue with safe local work.
