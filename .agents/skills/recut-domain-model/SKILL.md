---
name: recut-domain-model
description: Defines ReCut OS validated TypeScript data models for materials, physical stock units, part instances, plans, source provenance, cut trees, inventory lifecycles, and exact accounting. Use for schema/types/contract changes.
---

# Goal
Build a single canonical and auditable domain model that connects the optimizer, React UI, and Supabase persistence.

## Procedure
1. Read PRD sections 7–10. Create explicit TypeScript types and Zod schemas for material, physical stock unit, job part, part instance, cut-tree node, source allocation, plan, and metrics.
2. Normalize dimensions as integer `mm`, area as `mm²`, and prices as integer minor units. Enforce upper bounds to avoid unsafe JS integer multiplication.
3. Distinguish immutable standard-sheet *template* from an individually identified physical available sheet; and both from a virtual newly purchased sheet.
4. Expand each quantity to stable unique part-instance IDs before solving. Preserve original part references for display.
5. Define stock lifecycle `available → consumed`, and generated remnant `pending_confirmation → available` or rejected; prohibit double-use.
6. Define plan lifecycle `draft → committed` with input snapshot and algorithm version/seed; editing a job must not mutate existing plan history.
7. Define material matching including thickness, grain, and orientation compatibility. Reject ambiguous input rather than silently changing requirements.
8. Make the optimizer domain pure and serializable; keep Supabase IDs and pricing in typed wrappers rather than embedding DB calls into the algorithm.
9. Document invariants alongside types; test boundary values.

## Never
- Use floating-point centimeters as the calculation source of truth.
- Treat one inventory quantity row as one physical stock unit if that makes allocations ambiguous.
- Trust JSONB optimizer output before Zod parsing and independent validation.
- Infer or fabricate prices or ownership from the browser.
