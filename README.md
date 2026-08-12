# Tesla STEM Clubs

Expo React Native app for the Tesla STEM High School club directory, backed by
Supabase (Postgres + Auth + Storage).

## Run

```bash
npm install
npm run start
```

The Supabase project URL and anon key are committed in `app.json` under
`expo.extra` — the anon key is designed to be public and every table is protected
by row level security. Override them locally with `EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_ANON_KEY` in a `.env` file if you point the app at a
different project.

## Backend

Live project: `oudyqcyppdgaawitadlr` ("Clubs for STEM", us-east-1).

Apply schema changes with the full migrations directory in filename order:

```bash
supabase db push
```

`supabase/migrations/001_initial_schema.sql` is a historical baseline only — the
live schema is the baseline plus the timestamped migrations that follow it.

## Sign-in: email verification codes

There are no passwords. `signInWithOtp` emails a 6-digit code, `verifyOtp`
exchanges it for a session, and the session is persisted in AsyncStorage.

**Two email templates must contain `{{ .Token }}`**, in Dashboard →
Authentication → Emails:

- **Confirm signup** — sent on a student's *first* ever sign-in, when the account
  is created.
- **Magic Link** — sent on every sign-in after that.

Supabase's defaults render only a link, so a template missing the variable means
students receive an email with no code in it. Because the two cases issue
different token types, `verifyCode` tries `type: 'email'` and falls back to
`type: 'signup'`, so both first-time and returning sign-ins work.

Delivery also depends on SMTP: Supabase's built-in sender is rate limited and
only delivers to project team members. Configure a custom SMTP provider before
students use the app.

## Security model

- Accounts are restricted to `@lwsd.org`; the `handle_new_user` trigger rejects
  anything else at sign-up, so the domain gate cannot be bypassed by the client.
- Roles (`app_role`): `special_admin` (exactly one, school-wide owner),
  `verified_president`, `club_admin`, `student`. `super_admin` no longer exists.
- Exactly one `special_admin` exists and can only be granted through
  `bootstrap_special_admin()`, which is not callable from the API.
- Clubs are `pending` until the special admin approves them; only approved clubs
  are readable by students.
- Users cannot write their own `role`, `email`, or president-review columns — a
  trigger reverts those, so privilege escalation is impossible from the client.
- Every policy is scoped to the `authenticated` role: the anon key alone reads
  nothing and can call no RPC.
- Push notifications must be sent by a trusted backend, never with service
  credentials from the app.

## Edge Functions

- `delete-account` — permanent self-service account deletion. It reads the user
  id from the verified JWT, refuses to delete the sole `special_admin`, writes an
  audit entry, then deletes the auth user. Deploy with
  `supabase functions deploy delete-account`.
