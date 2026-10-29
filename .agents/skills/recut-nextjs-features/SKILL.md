---
name: recut-nextjs-features
description: Implements complete ReCut OS application vertical slices in Next.js App Router, connecting validated React forms, server-side authorization, optimizer results, Supabase data, and meaningful UI states.
---

# Goal
Ship real end-to-end features rather than disconnected polished pages.

## Feature workflow
1. Read the PRD user story and acceptance criteria; inspect current routes, domain types, and database migrations.
2. Start with typed Zod input and output schemas; route data through authenticated server actions/route handlers as appropriate.
3. Build the smallest functional data path: form → server validation → authorized DB/domain operation → fresh rendered state with actionable success/error.
4. Split server-only Supabase/secret code from browser-interactive components; follow Next.js App Router data caching and revalidation guidelines for the installed version.
5. All user-controlled identifiers and prices are untrusted. Reload canonical DB values on the server before an optimization or mutation.
6. Implement loading, empty, invalid, unauthorized, stale, and network failure states. Prevent duplicate submission and show real completion only after server success.
7. On `previewOptimization`, pass validated normalized input to the **same pure optimizer** used by `/demo`; do not create two separate algorithms.
8. Persist plan input snapshots and result version/seed. Do not mutate old plans when source jobs change.
9. Follow accessible responsive patterns and preserve keyboard interaction.
10. Add unit/integration/E2E coverage for the feature and run checks before declaring it done.

## Anti-patterns
No fake CRUD handlers, direct client-side DB writes bypassing intended validation, hardcoded baseline savings, arbitrary JSON without parsing, or 'success' notifications triggered before a real transaction completes.
