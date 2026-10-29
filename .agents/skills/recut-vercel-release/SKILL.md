---
name: recut-vercel-release
description: Prepares and verifies ReCut OS production deployment through GitHub and Vercel, secure Supabase environment variables, auth redirect URLs, CI, preview branches, and production smoke tests.
---

# Goal
Turn the working Next.js project into a secure, reproducible, publicly accessible demo.

## Procedure
1. Inspect code and package scripts before deployment; verify builds locally.
2. Keep `.env.local` ignored and `.env.example` safe. Browser env vars may include only the Supabase URL and publishable key; never include service-role/secret key.
3. Add GitHub Actions CI that installs dependencies and runs lint/typecheck/unit tests/build; use protected/no-secret test configuration where applicable.
4. Ensure the app includes a login-free `/demo` that can render even if Supabase is not configured in the **guest demo code path**, while authenticated routes show a setup/auth error safely.
5. Ask before creating/pushing public repositories or deploying externally. Document exactly what actions require the user's account access.
6. Import the GitHub repository into Vercel, set the Next.js preset, environment variables per Preview and Production, and the production branch; inspect build logs.
7. Update Supabase authorized Site URL and redirect allowlist to match real domains, including preview behavior only if needed and safe.
8. Verify public landing and `/demo` in an incognito session; verify authenticated login, write path, plan persistence, and logout.
9. Check that no secrets are in Git history or frontend bundles. Re-run production smoke test after environment variable changes/redeployments.
10. Record the exact deployed URL and the results of tests, including any blockers. Do not invent or claim unobserved success.

## Do not
- Add plaintext keys to README/screenshots.
- Run destructive database resets as part of deploy.
- Promise deployment is complete until a real public URL and smoke test exist.
- Use live production data for automated destructive tests.
