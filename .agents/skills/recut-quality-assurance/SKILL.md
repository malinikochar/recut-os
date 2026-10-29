---
name: recut-quality-assurance
description: Tests ReCut OS geometry, optimizer correctness, deterministic baseline, Supabase RLS and atomic commits, Next.js user flows, and regressions. Use for test writing, QA, security verification, or release readiness.
---

# Goal
Make implementation evidence stronger than screenshots.

## Procedure
1. Derive tests from each P0 acceptance criterion and from the invariants in `AGENTS.md` and PRD section 11.
2. Use Vitest for pure functions and geometry; write cases for kerf, exact fits, illegal residue, orientation/grain, material mismatch, duplicates, infeasible jobs, overflow/invalid quantities, and conservation accounting.
3. Run a separately written geometry verifier on every feasible plan. Include intentionally corrupted cut trees to prove it actually rejects failures.
4. Add deterministic fixture snapshot/equality tests for algorithm version + seed + input hash. Avoid brittle UI screenshots as a substitute for logic.
5. Integration-test Supabase auth and RLS with two distinct users and a signed-out client. Cover forbidden SELECT/INSERT/UPDATE/DELETE and cross-owner foreign keys.
6. Test race/transaction behavior: two plans referencing one stock, stale commit returns a conflict and rollback.
7. Test `previewOptimization` doesn't mutate stock; only successfully committed plans do, and resulting remnants require manual confirmation.
8. Use Playwright for the guest demo and the authenticated end-to-end material/job/plan lifecycle; test empty/error states and mobile navigation.
9. Run `lint`, `typecheck`, `test`, `build`, and key e2e checks; record failures plainly and fix highest-risk issues first.
10. Maintain a release checklist tracking actually observed outputs, not promises.

## Release blockers
Wrong/duplicated parts, physically infeasible cuts, leaked user data, invented impact numbers, demo route requiring login, or an unbuildable production app.
