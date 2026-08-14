-- Tesla STEM Clubs — club platform schema.
--
-- Extends the directory (clubs / announcements / roles) into a full club
-- management platform: memberships, board members with per-permission grants,
-- events, files, notes, notifications with per-club preferences, president
-- claims, and school-wide announcements.
--
-- Authorization rule for the whole file: the client is never trusted. Every
-- privileged mutation is either an RLS policy that re-derives the caller from
-- auth.uid(), or a SECURITY DEFINER RPC that re-checks the caller's role
-- before writing. Hiding a button in the app changes nothing here.

-- ===========================================================================
-- 1. ENUMS AND CONSTANTS
-- ===========================================================================
create type public.club_member_role as enum ('member', 'board', 'president');
create type public.membership_status as enum ('pending', 'active', 'rejected', 'removed');
create type public.event_status as enum ('scheduled', 'cancelled');

-- The permission keys a president may grant to a board member. Kept as text
-- (not an enum) so a later feature can add one without an enum migration.
create or replace function public.club_permission_keys() returns text[]
  language sql immutable set search_path = pg_catalog, public, pg_temp as $$
  select array['announcements', 'events', 'files', 'notes', 'members', 'board', 'settings']::text[]
$$;

-- ===========================================================================
-- 2. CLUB PROFILE COLUMNS
-- ===========================================================================
alter table public.clubs
  add column logo_url text,
  add column logo_key text,
  add column banner_url text,
  add column banner_key text,
  add column instagram text,
  add column website text,
  add column join_policy text not null default 'open'
    check (join_policy in ('open', 'approval')),
  add column is_active boolean not null default true,
  add column member_count integer not null default 0;

-- ===========================================================================
-- 3. MEMBERSHIPS  (Student -> Club Member -> Board Member -> President)
-- ===========================================================================
create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.club_member_role not null default 'member',
  status public.membership_status not null default 'active',
  -- Board-member verification lifecycle. null = never requested.
  board_status public.approval_status,
  position text,
  permissions text[] not null default '{}',
  board_message text,
  board_requested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  rejection_reason text,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id),
  constraint club_members_permissions_valid
    check (permissions <@ public.club_permission_keys())
);

create index club_members_user_idx on public.club_members (user_id, status);
create index club_members_board_queue_idx on public.club_members (club_id, board_status);

-- ===========================================================================
-- 4. EVENTS, FILES, NOTES
-- ===========================================================================
create table public.club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'Meeting',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  organizer text,
  status public.event_status not null default 'scheduled',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_events_time_order check (ends_at is null or ends_at >= starts_at)
);

create index club_events_club_time_idx on public.club_events (club_id, starts_at);
create index club_events_upcoming_idx on public.club_events (starts_at) where status = 'scheduled';

create table public.club_files (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  folder text not null default 'General',
  title text not null,
  description text,
  file_url text not null,
  file_key text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index club_files_club_idx on public.club_files (club_id, created_at desc);

create table public.club_notes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'General',
  pinned boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index club_notes_club_idx on public.club_notes (club_id, pinned desc, updated_at desc);

-- Announcements gain edit tracking and pinning; club_id null = school-wide.
alter table public.announcements
  add column pinned boolean not null default false,
  add column updated_at timestamptz not null default now(),
  add column updated_by uuid references public.profiles(id);

-- ===========================================================================
-- 5. NOTIFICATIONS, PREFERENCES, PUSH TOKENS
-- ===========================================================================
create table public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  type text not null check (type in (
    'announcement', 'school_announcement', 'event_created', 'event_updated',
    'event_cancelled', 'event_reminder', 'file_uploaded', 'note_posted',
    'join_request', 'board_request', 'membership_approved', 'board_approved',
    'board_rejected', 'club_approved', 'club_rejected'
  )),
  title text not null,
  body text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_inbox_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- One row per user for the global default (club_id null) plus one row per club
-- the user has overridden.
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  announcements boolean not null default true,
  events boolean not null default true,
  files boolean not null default true,
  notes boolean not null default true,
  reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index notification_prefs_club_uk
  on public.notification_preferences (user_id, club_id) where club_id is not null;
create unique index notification_prefs_global_uk
  on public.notification_preferences (user_id) where club_id is null;

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- ===========================================================================
-- 6. PRESIDENT CLAIMS ON EXISTING CLUBS
-- ===========================================================================
create table public.club_claims (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  position text not null default 'President',
  message text,
  status public.approval_status not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index club_claims_open_uk
  on public.club_claims (club_id, user_id) where status = 'pending';

-- ===========================================================================
