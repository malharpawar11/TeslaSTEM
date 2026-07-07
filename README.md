# Tesla STEM Clubs

Production-oriented Expo React Native app foundation for the Tesla STEM High School club directory.

## Run

```bash
npm install
npm run start
```

Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then apply `supabase/migrations/001_initial_schema.sql` to Supabase.

## Security model

- SSO accounts restricted to `@lwsd.org` profiles.
- RBAC roles: `special_admin`, `verified_president`, `club_admin`, `student`.
- Supabase RLS scopes club admins to assigned clubs.
- Audit logs are available to Super Admins.
- Push notifications should be sent by trusted backend functions only, never directly with service credentials from the client.
