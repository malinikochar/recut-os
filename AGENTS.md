# ReCut OS — Always-On Agent Rules

Read `PRD.md` before changing application architecture. This repository is a hackathon MVP meant to behave like reliable industrial software.

## Product and scope

- Ship P0 requirements before P1 features. The real cutting algorithm, honest baseline, and one-click public demo are top priority.
- Keep the frontend, API, optimizer, and deployment in a single Next.js/TypeScript project unless the PRD is explicitly revised.
- Do not invent customer interviews, impact results, or production deployments.
- Distinguish estimated purchases avoided from actual material physically saved.

## Geometry invariants

- Geometric dimensions: positive integer mm. Currency: integer minor units. Reject invalid values before planning or database mutation.
- Return a *guillotine cut tree*, not only free-form rectangles. Verify independently. Model kerf width and accounting.
- Every requested part appears exactly once; no overlapping placements; stock material/thickness/grain match; rotation permissions respected.
- Sum of part area + residual regions + kerf strip areas must equal opened stock area.
- An unsatisfied part makes the plan explicitly infeasible; never silently omit parts.
- Stock is owned and unique per physical rectangle. Pending remnants are not available before confirmation.

## Supabase and security

- Use official `@supabase/ssr` integration for cookie-backed sessions and Supabase RLS for all exposed private tables.
- Re-derive user identity on the server, validate actions with Zod, and never accept a client-supplied owner ID as authoritative.
- Enforce owner-safe foreign keys. Test owner vs other user vs anonymous data operations.
- No Supabase secret key/service role key in client bundles, examples, source control, or `NEXT_PUBLIC_*` variables.
- Use additive SQL migrations; ask permission before deleting data or applying destructive migrations.
- Atomic commit must revalidate stock state in a transaction and create pending-confirmation remnants.

## Engineering quality

- Prefer explicit types, pure functions, small modules, predictable state. No `any` for core geometry/plans.
- Treat all optimizer output as untrusted until checked by the independent verifier.
- Keep a deterministic sample dataset and a reproducible baseline benchmark.
- Run checks relevant to changed files; do not state checks passed unless they were run.
- Prioritize clear error/empty/loading states, keyboard access, responsive layouts, and reduced-motion support.
- Avoid dependencies and external APIs not required by the MVP. Never silently introduce paid products.

## Delivery discipline

- Work incrementally; log decisions and deviations from the PRD.
- Preserve `.env.example` placeholders only; commit no credentials.
- Use repository skills under `.agents/skills/` as focused task procedures.
- Call out blockers honestly; do not simulate a finished deployment.
