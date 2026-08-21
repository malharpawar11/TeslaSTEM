# ClubHub Backend Architecture

Production-grade backend for the ClubHub mobile app (Apple App Store / Google
Play Store distribution). Backend-only: the existing Expo React Native
frontend is unchanged.

## 1. Tech stack

| Concern              | Choice                                        | Why                                                         |
| -------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Language             | TypeScript (Node.js 20+)                      | Strong typing for security-critical code paths.             |
| HTTP framework       | Express 4                                     | Stable, well-audited; clear middleware model.               |
| Database             | PostgreSQL 16                                 | ACID, constraints, full-text search, mature hosting.        |
| ORM                  | Prisma                                        | Type-safe queries, no string SQL → injection-resistant.     |
| Cache / rate-limit   | Redis (ioredis)                               | Shared rate-limit counters across replicas.                 |
| Auth                 | JWT access + opaque refresh                   | App Store friendly stateless access, revocable refresh.     |
| Password KDF         | argon2id                                      | OWASP-recommended.                                          |
| OAuth                | Google + Microsoft                            | School identity (Google Workspace / Microsoft 365).         |
| Push                 | Expo Push API                                 | Matches the existing Expo client.                           |
| Logging              | pino                                          | Fast, structured, redaction-aware.                          |
| Validation           | zod                                           | Single source of truth for input shape + types.             |
| Deployment           | Docker → Cloud Run / Fly / ECS                | Stateless, horizontally scalable.                           |

## 2. Folder structure

```
backend/
├── prisma/
│   └── schema.prisma           # data model + migrations
├── src/
│   ├── config/                 # env (zod-validated), constants
│   ├── lib/                    # cross-cutting infra (prisma, redis, logger, jwt, push, audit, password)
│   ├── middleware/             # requestId, cors, authn, rbac, rateLimit, validate, errorHandler
│   ├── modules/
│   │   ├── auth/               # signup/login/oauth/refresh/logout/delete
│   │   ├── users/              # /users/me + device tokens
│   │   ├── clubs/              # CRUD, follow, admin assignment, approval
│   │   ├── announcements/      # create, list, feed, mark-read, delete
│   │   ├── moderation/         # /reports, /admin/reports
│   │   ├── admin/              # /admin/audit-logs
│   │   └── health/             # /health, /ready
│   ├── utils/                  # errors, pagination, sanitize, schoolDomain, asyncHandler
│   ├── types/                  # express request augmentation
│   ├── routes.ts               # central /api/v1 router
│   ├── app.ts                  # express app composition
│   └── server.ts               # bootstrap + graceful shutdown
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── ARCHITECTURE.md             # (this file)
```

Each feature module follows a `routes → controller → service → prisma` flow.
Schemas (zod) live next to the routes that use them. Controllers handle HTTP
concerns only; services own business logic and DB access.

## 3. Database schema

See `prisma/schema.prisma`. Highlights:

- `User` (role: STUDENT | CLUB_ADMIN | SUPER_ADMIN; status: ACTIVE | SUSPENDED | DELETED; tokenVersion for global session invalidation)
- `OAuthIdentity` (unique `provider+providerSub`; enables account linking by school email)
- `RefreshToken` (sha-256 hashed; `familyId` for reuse detection; rotation on each refresh)
- `EmailVerificationToken`, `PasswordResetToken` (hashed, single-use, TTL)
- `DeviceToken` (Expo push tokens; unique so re-registration upserts)
- `Club` (slug; isApproved gates visibility; soft-deletable)
- `ClubAdminAssignment` (composite PK; assignedById audit)
- `ClubMembership` (composite PK; type FOLLOWER | MEMBER)
- `Announcement` (clubId, authorId, schoolWide flag; soft-deletable)
- `AnnouncementDelivery` (fan-out table for unread state)
- `Report`, `AuditLog`

Indexes cover the hot paths (clubs by approval+name, announcements by club+createdAt, refreshTokens by user+expiry, auditLogs by actor+time).

## 4. Authentication architecture

```
Mobile App ──signup/login──► /api/v1/auth/login
                                │
                                ▼
                  argon2id verify (constant-time) ── miss path uses dummy hash
                                │
                                ▼
                  issue access JWT (HS256, 15m, includes tokenVersion)
                  issue refresh: opaque 256-bit + signed envelope, hashed at rest
                  attach refresh metadata (ip, userAgent, familyId)
```

### Refresh rotation
- Refresh tokens are opaque, stored as SHA-256 hashes.
- Each refresh issues a new token in the same `familyId`; the old one is marked `revokedAt`.
- If a revoked refresh token is replayed → the entire family is revoked (reuse detection).
- The wire token is `<JWT envelope>.<opaque>`. The JWT carries `jti=refreshToken.id` so we can look up the row without scanning.

### OAuth
- Google: `id_token` verified via `google-auth-library` (audience pinned to our client id).
- Microsoft: `id_token` verified via the tenant's JWKS endpoint.
- After cryptographic verification, the email domain is checked against `SCHOOL_EMAIL_DOMAINS` (server-side only; never trust the client).
- If an OAuth identity is unseen but the verified email matches an existing user, identities are linked.

### Session invalidation
- "Logout everywhere" bumps `User.tokenVersion`. Every access token carries `tv`; the authn middleware rejects tokens whose `tv` no longer matches.
- Role changes also bump `tokenVersion` (handled in services where roles change).

### Account deletion (App Store §5.1.1(v))
- `DELETE /api/v1/auth/account` soft-deletes, strips PII, revokes all sessions, clears device tokens, removes OAuth identities.
- Hard-purge job runs after a retention window (to be added as a cron: see roadmap).

## 5. RBAC

Three roles enforced server-side. The frontend is never trusted.

| Capability                          | STUDENT | CLUB_ADMIN (of club) | SUPER_ADMIN |
| ----------------------------------- | :-----: | :------------------: | :---------: |
| Browse approved clubs               | ✓       | ✓                    | ✓           |
| Follow / unfollow                   | ✓       | ✓                    | ✓           |
| Propose a club (pending approval)   | ✓       | ✓                    | ✓ (auto-approved) |
| Edit a club                         |         | ✓ (own only)         | ✓           |
| Send announcement to followers      |         | ✓ (own only)         | ✓           |
| Send school-wide announcement       |         |                      | ✓           |
| Approve/unapprove clubs             |         |                      | ✓           |
| Delete a club                       |         |                      | ✓           |
| Assign / remove club admins         |         |                      | ✓           |
| View audit logs                     |         |                      | ✓           |
| Resolve reports                     |         |                      | ✓           |
| File a report                       | ✓       | ✓                    | ✓           |

Two-layer enforcement:
1. **Middleware** (`requireAuth`, `requireRole`, `requireClubAdmin`) reject before route handlers run.
2. **Services** (`assertCanManageClub`, scope filters in queries) re-check before mutating.

## 6. Security plan

| Concern                  | Mitigation                                                                 |
| ------------------------ | -------------------------------------------------------------------------- |
| SQL injection            | Prisma parameterised queries only, no raw SQL with user input.            |
| XSS                      | API returns JSON only; sanitizeText strips control + zero-width chars.     |
| CSRF                     | API consumed by mobile / SPA with `Authorization: Bearer`; no auth cookies on mutating endpoints. |
| Credential stuffing      | argon2id + redis-backed per-(ip,email) rate limit on `/auth/*`.            |
| Token theft / replay     | Short access TTL + refresh rotation + family reuse detection.              |
| Privilege escalation     | Server-side RBAC; role changes bump tokenVersion to invalidate old tokens. |
| IDOR                     | Every resource access checks ownership / role; never trust path ids.       |
| Mass assignment          | zod schemas use strict shapes; `req.body` is replaced with parsed object.  |
| Verbose errors           | AppError exposes 4xx messages only; 5xx are generic.                       |
| Secret leakage           | pino redaction list; `.env` gitignored; never logged at any level.         |
| Header spoofing          | `trust proxy` configured to exact hop count; only the LB can set `X-Forwarded-For`. |
| DOS                      | Global + per-route rate limits + 256KB body cap + helmet headers.          |
| Email enumeration        | Login always verifies against a dummy hash on miss (constant-time).        |
| Push spam                | Tight `pushLimiter` on announcement creation.                              |
| Audit                    | `AuditLog` written for every privileged action; super-admin can read.      |

## 7. API surface (`/api/v1`)

```
POST   /auth/signup                    public, rate-limited
POST   /auth/login                     public, rate-limited
POST   /auth/oauth/google              public, rate-limited
POST   /auth/oauth/microsoft           public, rate-limited
POST   /auth/refresh                   public, rate-limited
POST   /auth/logout                    auth optional
DELETE /auth/account                   auth

GET    /users/me                       auth
PATCH  /users/me                       auth
POST   /users/me/devices               auth
DELETE /users/me/devices/:id           auth

GET    /clubs                          optional auth; cursor pagination + search
GET    /clubs/:clubId                  optional auth
POST   /clubs                          auth (pending unless super)
PATCH  /clubs/:clubId                  club admin / super
DELETE /clubs/:clubId                  super
POST   /clubs/:clubId/follow           auth
DELETE /clubs/:clubId/follow           auth
GET    /clubs/:clubId/members          club admin / super
POST   /clubs/:clubId/admins           super
DELETE /clubs/:clubId/admins/:userId   super
POST   /clubs/:clubId/approve          super

GET    /clubs/:clubId/announcements    auth
POST   /clubs/:clubId/announcements    club admin (push-rate-limited)
GET    /me/feed                        auth
POST   /announcements/:id/read         auth
DELETE /announcements/:id              author / club admin / super

POST   /reports                        auth
GET    /admin/reports                  super
PATCH  /admin/reports/:id              super

GET    /admin/audit-logs               super

GET    /health                         public, liveness
GET    /ready                          public, readiness (DB + redis)
```

### Response envelope
Successful responses return the resource directly or `{ items, nextCursor }`
for lists. Errors always return:
```json
{ "error": { "code": "FORBIDDEN", "message": "...", "requestId": "...", "details": { } } }
```

## 8. Logging & monitoring

- `pino-http` logs every request with `requestId`, `userId`, method, status, latency.
- Sensitive headers + body fields are redacted (`Authorization`, `Cookie`, passwords, tokens, hashes).
- `AuditLog` captures actor + action + entity + IP + UA for every privileged action.
- `/ready` reports DB + Redis state for the LB.
- In prod, ship stdout to your log aggregator (Datadog / Logflare / CloudWatch).

## 9. Deployment readiness

- Stateless API → horizontal scaling. Refresh tokens / rate-limit counters are
  in Postgres / Redis.
- `Dockerfile` is multi-stage, runs as non-root, includes a healthcheck.
- `docker-compose.yml` brings up Postgres + Redis + API locally.
- Environments separated via `.env`. Required env vars validated at boot
  (`src/config/env.ts`); the process exits if anything is missing.
- Migrations run via `npm run prisma:migrate:deploy` in CI/CD before the new
  image is promoted.

### First-run checklist
```
cp .env.example .env             # fill secrets
docker compose up -d postgres redis
npm install
npm run prisma:migrate           # create initial migration
npm run dev
```
On first prod boot, set `BOOTSTRAP_SUPER_ADMIN_EMAIL` to your account so a
super admin exists; the bootstrap path runs once and is a no-op afterwards.

## 10. Roadmap (next iterations)

1. **Email delivery**: wire `EmailVerificationToken` + `PasswordResetToken` to a transactional email provider (Postmark / SES). Currently issued but unsent.
2. **Cron jobs**: purge refresh tokens past expiry, hard-delete users past retention window, cleanup expired email tokens.
3. **Realtime**: optional WebSocket/SSE channel for live announcement delivery in addition to push.
4. **APNs/FCM direct**: Expo push is the v1 path; if Expo dependency is dropped, switch to direct APNs/FCM.
5. **OpenAPI**: generate spec from zod schemas (`zod-to-openapi`) for the mobile client + docs.
6. **CI**: typecheck, lint, prisma validate, integration tests against an ephemeral Postgres.
7. **Observability**: OpenTelemetry tracing exporter; Sentry for errors.
8. **Image upload**: direct-to-S3 presigned URLs for club images; server stores the resulting URL.
