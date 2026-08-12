# App Store Readiness

## In place

- School SSO only: accounts must end in `@lwsd.org`, enforced by a database
  trigger rather than by the client.
- Passwordless sign-in with emailed 6-digit verification codes, covering both
  first-time (signup token) and returning (magic-link token) sign-ins.
- Permanent self-service account deletion via the `delete-account` Edge Function.
- Push permission is requested only when a student follows a club, and a missing
  permission or token degrades gracefully instead of crashing.
- Privacy and terms screen shipped in the app.
- Row level security on every table, scoped to signed-in users; privileged
  actions run through SECURITY DEFINER RPCs that re-check the caller's role.
- Admin actions write audit log entries with actor, entity, and metadata.
- No service-role key or other secret ships in the app.
- No seed, sample, or demo data: the directory starts empty and fills from real
  submissions.

## Before submitting

- [ ] Add `{{ .Token }}` to **both** the "Confirm signup" and "Magic Link" email
      templates — without it the verification email arrives with no code in it.
- [ ] Configure custom SMTP. The built-in sender is rate limited and only
      delivers to project team members, so students would never get a code.
- [ ] Run `eas init` and replace `expo.extra.eas.projectId` in `app.json`. Until
      then push tokens cannot be minted and follows are saved without one.
- [ ] Decide what sends push notifications (an Edge Function reading
      `club_followers.expo_push_token`); announcements are stored and displayed
      in-app today, but nothing pushes them to devices.
- [ ] Decide the fate of the unused Express/Prisma tables (`User`,
      `EmailVerificationToken`, …). They are empty and locked down, but they are a
      second, parallel auth system in the same database.
- [ ] Enable leaked-password protection in Supabase Auth if passwords are ever
      turned on (currently unused — codes only).
