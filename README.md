# Tesla STEM Clubs

Production-oriented Expo React Native app foundation for the Tesla STEM High School club directory.

## Run

```bash
npm install
npm run start
```

Configure `EXPO_PUBLIC_INSFORGE_URL` and `EXPO_PUBLIC_INSFORGE_ANON_KEY` (see `.env.example`). The backend schema lives in `migrations/` and is applied with `npx @insforge/cli db migrations up --all`.

After the first admin signs up (and verifies their email) through the app, mint them as the special admin from the InsForge SQL editor / CLI:

```
npx @insforge/cli db query "select public.bootstrap_special_admin('admin-name@lwsd.org')"
```

## Security model

- Accounts restricted to `@lwsd.org` addresses — enforced client-side and by a `BEFORE INSERT` trigger on `auth.users`, so a tampered client still cannot create a non-LWSD account.
- RBAC roles: `special_admin`, `verified_president`, `club_admin`, `student`.
- InsForge (Postgres) RLS scopes club admins to assigned clubs.
- Audit logs are available to Super Admins.
- Push notifications should be sent by trusted backend functions only, never directly with service credentials from the client.
