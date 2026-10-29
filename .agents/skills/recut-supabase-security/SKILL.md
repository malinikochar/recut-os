---
name: recut-supabase-security
description: Implements secure Supabase PostgreSQL schema, per-operation RLS, cookie-based SSR authentication, owner-safe relations, transactions, and inventory-safe plan commits. Use for database or auth changes.
---

# Goal
Make Supabase a real, secure source of truth without leaking other users' materials, jobs, or stock units.

## Procedure
1. Read PRD sections 7–10. Check current official Supabase guidance for Next.js SSR and RLS.
2. Implement local migrations under `supabase/migrations/` and document how to apply them safely. Avoid destructive resets in production.
3. Make every private table user-scoped with `user_id`; enable RLS, revoke unexpected `anon`/`authenticated` grants, grant minimum privileges, and create explicit owner policies per SELECT/INSERT/UPDATE/DELETE.
4. Ensure child IDs cannot reference another user's parent: composite `(parent_id, user_id)` foreign keys (with matching parent unique constraints) or equivalent DB-enforced authorization.
5. Set indexes for `user_id` and common owner/filter combinations; validate constraint violations.
6. Use `@supabase/ssr` browser/server clients per current official pattern, handle session refresh and auth redirects, and authenticate at every server action and route handler.
7. Accept a material/job/stock identifier only after verifying ownership; ignore any user ID supplied by the browser.
8. Make plan commit a single database transaction/RPC: row-lock all physical source stock units, reject changed/consumed/non-owned stock, confirm uniqueness, mark consumed, insert pending-confirmation remnants from a verified snapshot, mark plan committed; roll back on any error. Protect the RPC with authenticated identity checks and constrained EXECUTE permission.
9. Create Supabase policy tests (`supabase test db` where available) covering owner, another signed-in user, and signed-out user, for both allowed and denied writes/reads.
10. Never expose service-role/secret key in `NEXT_PUBLIC_*`, client code, Vercel build logs, or Git.

## Decisions
Use **publishable** key for browser + signed-in RLS context. Avoid a service-role client for user CRUD. If a privileged DB function is needed, restrict it and keep the search path pinned; prefer no privileged function when a regular invoker function can be safe.

## Done when
All tables/migrations are reproducible; auth flows work; unauthorized cross-user actions fail; a race to commit the same stock results in one success and one explicit conflict, not double-consumption.
