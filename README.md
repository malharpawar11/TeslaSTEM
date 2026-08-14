# Tesla STEM Clubs

The club hub for Tesla STEM High School: students discover and join clubs, and
club leadership manages members, announcements, files, notes, events, and
notifications from one place. Expo (iOS / Android / web) on an InsForge
(Postgres) backend.

## Run

```bash
npm install
npm run start        # npm run web / ios / android
npm run typecheck
```

Configure `EXPO_PUBLIC_INSFORGE_URL` and `EXPO_PUBLIC_INSFORGE_ANON_KEY` (see
`.env.example`). The backend schema lives in `migrations/` and is applied with
`npx -y @insforge/cli db migrations up --all`. Storage needs two buckets:

```bash
npx -y @insforge/cli storage create-bucket club-assets   # logos and banners
npx -y @insforge/cli storage create-bucket club-files    # club resources
```

After the first admin signs up (and verifies their email) through the app, mint
them as the school admin from the InsForge CLI:

```bash
npx -y @insforge/cli db query "select public.bootstrap_special_admin('admin-name@lwsd.org')"
```

> Note: `db query` splits statements naively, so multi-line SQL containing
> semicolons has to be sent as a single line. Use `db migrations` for anything
> structural.

## What the app does

**Students** browse the directory, join clubs (instantly, or by request at
clubs that vet members), and get one dashboard combining every joined club's
upcoming events, announcements, new files, and notifications. Events can be
added to Google Calendar or exported as `.ics` for Apple/other calendars, and a
platform-wide search covers clubs, announcements, events, files, and notes.

**Club leadership** gets a management area per club —
Overview · Announcements · Events · Members · Board · Files · Resources ·
Settings — with board-member verification: a student requests a position, the
president approves it and grants an exact set of permissions.

**School admins** approve new clubs, verify presidents, review claims on
existing clubs, transfer ownership, archive inactive clubs, and post
school-wide announcements.

## Roles and permissions

Two ladders, both enforced in Postgres:

| Account role (`profiles.role`) | Can |
| --- | --- |
| `student` | browse, join clubs, request board access or a club claim |
| `club_admin` | manage the clubs they were assigned |
| `verified_president` | manage the club they were verified for |
| `special_admin` | everything school-wide (exactly one account) |

| Club role (`club_members.role`) | Can |
| --- | --- |
| `member` | read the club's announcements, events, files, and notes |
| `board` | exactly the permissions the president granted |
| `president` | all seven permissions for that club |

Grantable permissions: `announcements`, `events`, `files`, `notes`, `members`,
`board`, `settings`.

## Security model

- Accounts are restricted to `@lwsd.org` addresses — enforced client-side and
  by a `BEFORE INSERT` trigger on `auth.users`, so a tampered client still
  cannot create a non-LWSD account.
- Authorization lives in the database, not the UI. Content writes are gated by
  RLS policies that call `has_club_permission(club_id, '<area>')`; membership,
  roles, permissions, claims, and ownership can only change through
  `SECURITY DEFINER` RPCs that re-derive the caller from `auth.uid()`. Changing
  an id in a request buys nothing.
- Files and notes are member-only (`is_club_member`); announcements and events
  stay public so the directory and calendar work before joining. The
  `club-files` bucket is public-read with unguessable keys (link-style
  sharing) — the row that points at an object is member-gated, and writes are
  restricted by key prefix to people holding the club's `files` permission.
- Notifications are written only by database triggers; a user's only permitted
  write to their inbox is marking rows read (enforced by a column-lock trigger).
- Privileged club columns (status, ownership, review fields) are pinned by
  `lock_club_privileged_fields`, and `profiles.role` by `lock_profile_role`.
- Audit rows are written by the RPCs themselves and readable only by the school
  admin.
- Attribution columns (`created_by`, `uploaded_by`, `actor`, …) are
  `ON DELETE SET NULL`, so deleting an account never fails and never deletes a
  club's history.
- Push: the app stores only an Expo push token. Delivery belongs to a trusted
  backend job — never send with service credentials from the client. Meeting
  reminders in the app are scheduled locally on the device.

## Layout

```
app/                     expo-router routes
  (tabs)/                Home · Clubs · Calendar · Alerts · Profile
  club/[id]/index.tsx    club profile + member area
  club/[id]/manage.tsx   club admin dashboard
  club/new.tsx           submit a club for approval
  admin.tsx              school-admin dashboard
  search.tsx             platform-wide search
src/data/                one repo per domain; every write returns {ok}|{error}
src/context/             auth, clubs, memberships, notifications, toasts, theme
src/lib/                 InsForge client, calendar (.ics / Google), push
migrations/              InsForge SQL, applied in filename order
```
