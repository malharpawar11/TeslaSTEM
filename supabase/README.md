# Supabase (legacy backend)

**This is not the backend the app uses.** The app moved to InsForge; the live
schema lives in `/migrations` at the repo root and is applied with
`npx @insforge/cli db migrations up --all`. Nothing in this directory runs as
part of the app, and `@supabase/supabase-js` is not a dependency.

It is kept as the record of the Supabase project that served the app before the
migration, so the schema and its fixes are not lost.

## Contents

| File | What it did |
| --- | --- |
| `001_initial_schema.sql` | Original tables, RLS, and the `@lwsd.org` sign-up trigger. |
| `002_fixes.sql` | Club INSERT policy and `log_audit()` as a SECURITY DEFINER RPC. |
| `003_roles_and_approval_workflow.sql` | Four-role model, president verification, three-state club approval. |
| `004`–`011` | Security and correctness work applied to the legacy project in Aug 2026 (see below). |

## What 004–011 fixed

These were applied to the live Supabase project and are recorded here because
the same classes of bug are worth checking for in any backend this app uses:

- **Server-owned columns were client-writable.** The profile UPDATE policy let a
  student rewrite their own `email` (the `@lwsd.org` gate) or self-approve
  `president_status`. Only `role` had been protected. (`006`)
- **The anon key could read and call too much.** Policies were granted to
  `public`, so the key shipped in the app evaluated them; helper functions were
  callable over `/rest/v1/rpc/*`. Now everything is `authenticated`-only and
  EXECUTE is revoked from `PUBLIC`; note that revoking from the `anon` role
  alone does nothing, because the grant is held via `PUBLIC`. (`007`, `008`)
- **Users could not be deleted.** Six foreign keys to `profiles(id)` were
  `NO ACTION`, so removing anyone who had submitted a club failed. Worse, the
  column-lock triggers reverted Postgres's own `ON DELETE SET NULL` cascade,
  because they fired for internal writes that have no `auth.uid()`. (`010`, `011`)
- **Prisma tables were exposed.** A parallel Express/Prisma schema sat in the
  same database with RLS disabled. (`004`)
- Missing FK indexes, an unmaintained `updated_at`, and a mutable
  `search_path` on a trigger function. (`005`, `006`, `009`)

`functions/delete-account/` is the Edge Function backing self-service account
deletion (an app store requirement): it takes the user id from the verified JWT,
refuses to delete the sole `special_admin`, writes an audit entry, then deletes
the user.
