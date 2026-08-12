-- Applied to production 2026-07-07. Recovered from
-- supabase_migrations.schema_migrations.
--
-- The Express/Prisma backend created these PascalCase tables in the same
-- `public` schema with RLS disabled, exposing them to anyone holding the anon
-- key. The mobile app never touches them; the backend reaches them through a
-- direct Postgres connection that bypasses RLS. Enabling RLS with no policies
-- is therefore a safe deny-all for anon/authenticated while leaving the backend
-- fully functional. Reversible with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.
alter table public."User" enable row level security;
alter table public."OAuthIdentity" enable row level security;
alter table public."RefreshToken" enable row level security;
alter table public."EmailVerificationToken" enable row level security;
alter table public."PasswordResetToken" enable row level security;
alter table public."DeviceToken" enable row level security;
alter table public."Club" enable row level security;
alter table public."ClubAdminAssignment" enable row level security;
alter table public."ClubMembership" enable row level security;
alter table public."Announcement" enable row level security;
alter table public."AnnouncementDelivery" enable row level security;
alter table public."Report" enable row level security;
alter table public."AuditLog" enable row level security;
alter table public."_prisma_migrations" enable row level security;
