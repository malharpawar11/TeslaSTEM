# ClubHub Backend

Production-grade API for the ClubHub mobile app. See [`ARCHITECTURE.md`](./ARCHITECTURE.md)
for the full design.

## Quick start

```bash
cp .env.example .env
# fill JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (32+ random bytes each),
# SCHOOL_EMAIL_DOMAINS, OAuth client ids.

docker compose up -d postgres redis
npm install
npm run prisma:migrate -- --name init
npm run dev
```

API serves at `http://localhost:4000/api/v1` once running. Try
`GET /api/v1/health`.

## Scripts

| Command                          | Purpose                                |
| -------------------------------- | -------------------------------------- |
| `npm run dev`                    | tsx watch mode                         |
| `npm run build`                  | tsc → `dist/`                          |
| `npm start`                      | run compiled server                    |
| `npm run typecheck`              | strict typecheck only                  |
| `npm run prisma:migrate`         | dev migration                          |
| `npm run prisma:migrate:deploy`  | apply migrations in CI/CD              |
| `npm run prisma:studio`          | open Prisma Studio                     |

## Required environment variables

The boot process validates every variable via zod (`src/config/env.ts`) and
exits if anything is missing or malformed. See `.env.example` for the full
list. Critical ones:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET` (32+ chars)
- `JWT_REFRESH_SECRET` (32+ chars)
- `SCHOOL_EMAIL_DOMAINS` (comma-separated)
- `GOOGLE_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_ID` (if those providers are enabled on the client)
- `CORS_ALLOWED_ORIGINS` (comma-separated; no wildcards in prod)

## Deployment

The included `Dockerfile` produces a non-root, healthchecked image suitable
for Cloud Run, Fly.io, or ECS. CI/CD should:

1. `npm run typecheck && npm test` (tests TBD)
2. `docker build` → push
3. `npx prisma migrate deploy` against the target DB
4. promote new revision
