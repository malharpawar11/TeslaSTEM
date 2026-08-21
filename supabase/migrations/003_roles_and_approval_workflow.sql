-- 003_roles_and_approval_workflow.sql
-- Builds the 4-role model, president verification, and a 3-state club
-- approval workflow on top of 001/002. Run ONCE after 002 (the destructive
-- steps are guarded, so a re-run is a safe no-op).
--
-- SECURITY MODEL: enforced in the database, never trusted from the client:
--   * Roles (high -> low): special_admin, verified_president, club_admin,
--     student. The client may *display* role-based UI, but every read/write
--     is independently gated by RLS and SECURITY DEFINER RPCs below.
--   * There is EXACTLY ONE special_admin. It can only be minted by
--     bootstrap_special_admin() from the SQL editor; no app code path,
--     and no other special_admin, can create a second one.
--   * Presidents must be verified by the special_admin. Clubs move
--     pending -> approved | rejected and are invisible to the public until
--     approved.
--   * Every privileged mutation runs through an RPC that re-checks the
--     caller's role server-side and writes an audit_logs row.

-- ===========================================================================
-- 1. ENUMS
-- ===========================================================================

-- Rebuild app_role as the 4 spec roles. Recreating the type (instead of
-- ALTER TYPE ... ADD VALUE) keeps the whole migration in one transaction and
-- lets us rename the legacy 'super_admin' to 'special_admin'. Guarded on the
-- presence of the legacy value so re-running this file does nothing.
do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'super_admin'
  ) then
    alter type public.app_role rename to app_role__old;
    create type public.app_role as enum
      ('special_admin', 'verified_president', 'club_admin', 'student');
    alter table public.profiles alter column role drop default;
    alter table public.profiles
      alter column role type public.app_role
      using (case role::text
               when 'super_admin' then 'special_admin'
               else role::text
             end)::public.app_role;
    alter table public.profiles alter column role set default 'student';
    drop type public.app_role__old;
  end if;
end $$;

-- Shared status enum for both club approval and president verification.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type public.approval_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

-- ===========================================================================
-- 2. PROFILES: president verification
-- ===========================================================================
-- president_status NULL  => ordinary student, never asked to be a president.
--                  pending/approved/rejected => reviewed by the special_admin.
alter table public.profiles
  add column if not exists president_status          public.approval_status,
  add column if not exists president_requested_at    timestamptz,
  add column if not exists president_reviewed_at     timestamptz,
  add column if not exists president_reviewed_by     uuid references public.profiles(id),
  add column if not exists president_rejection_reason text;

-- ===========================================================================
-- 3. CLUBS: 3-state status + president / review context
-- ===========================================================================
alter table public.clubs
  add column if not exists status           public.approval_status not null default 'pending',
  add column if not exists president_id     uuid references public.profiles(id),
  add column if not exists president_email  text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at      timestamptz,
  add column if not exists reviewed_by      uuid references public.profiles(id);

-- Migrate off the legacy boolean `approved`: backfill `status`, drop the
-- policies that reference the column, then drop the column itself.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clubs' and column_name = 'approved'
  ) then
    update public.clubs
      set status = case when approved then 'approved' else 'pending' end::public.approval_status;
    drop policy if exists "approved clubs readable" on public.clubs;
    drop policy if exists "users submit clubs"      on public.clubs;
    drop policy if exists "announcements readable"  on public.announcements;
    alter table public.clubs drop column approved;
  end if;
end $$;

-- The club submitter is its president by default.
update public.clubs set president_id = created_by where president_id is null;

-- ===========================================================================
-- 4. ROLE-CHECK HELPERS  (SECURITY DEFINER so RLS on `profiles` can never
--    hide the caller's own role from an authorization check)
-- ===========================================================================
create or replace function public.is_special_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'special_admin'
  )
$$;

-- Back-compat shim: policies/functions created in 001/002 still call
-- is_super_admin(). Keep it working by delegating to the new name.
create or replace function public.is_super_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select public.is_special_admin()
$$;

-- The caller's role, used by the UI-facing layer.
create or replace function public.my_app_role() returns public.app_role
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- A user may administer a club if they are the special_admin, an assigned
-- club_admin, OR the club's own verified president. This single function
-- drives every club-edit and announcement-creation permission check.
create or replace function public.can_admin_club(c uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.is_special_admin()
      or exists (
           select 1 from club_admins
           where club_id = c and user_id = auth.uid()
         )
      or exists (
           select 1 from clubs cl
           join profiles p on p.id = auth.uid()
           where cl.id = c
             and cl.president_id = auth.uid()
             and p.role = 'verified_president'
         )
$$;

-- ===========================================================================
-- 5. ROW LEVEL SECURITY: the real enforcement layer
-- ===========================================================================

-- CLUBS: the public sees only approved clubs. A submitter and a club's
-- admins additionally see their own pending/rejected clubs to track them.
drop policy if exists "approved clubs readable" on public.clubs;
drop policy if exists "clubs read approved or own" on public.clubs;
create policy "clubs read approved or own" on public.clubs
  for select using (
    status = 'approved'
    or created_by = auth.uid()
    or public.can_admin_club(id)
  );

-- CLUBS: any signed-in @lwsd.org user may submit, but only as a `pending`
-- club they own. Whether they are allowed to *run* it is decided at review.
drop policy if exists "users submit clubs"   on public.clubs;
drop policy if exists "clubs submit pending" on public.clubs;
create policy "clubs submit pending" on public.clubs
  for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

-- ANNOUNCEMENTS: readable once the club is approved, or to that club's
-- admins (so they can manage drafts before the club goes public).
drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements
  for select using (
    exists (
      select 1 from public.clubs c
      where c.id = club_id and c.status = 'approved'
    )
    or public.can_admin_club(club_id)
  );

-- CLUB_ADMINS: 001 enabled RLS but never added a SELECT policy, so the
-- assignment list was unreadable. Let club managers see their own roster.
-- Writes stay closed here on purpose; only the RPCs in section 8 mutate it.
drop policy if exists "club admins visible to managers" on public.club_admins;
create policy "club admins visible to managers" on public.club_admins
  for select using (public.can_admin_club(club_id) or user_id = auth.uid());

-- ===========================================================================
-- 6. COLUMN-LOCK TRIGGERS: defence in depth
--    RLS grants a club admin UPDATE on their club; these triggers stop them
--    editing the fields that decide privilege (e.g. approving their own
--    club, or self-promoting). Privileged RPCs run as the special_admin and
--    therefore pass these checks.
-- ===========================================================================

-- CLUBS: only the special_admin may change status / ownership / review data.
create or replace function public.lock_club_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_special_admin() then
    new.status           := old.status;
    new.created_by       := old.created_by;
    new.president_id     := old.president_id;
    new.rejection_reason := old.rejection_reason;
    new.reviewed_at      := old.reviewed_at;
    new.reviewed_by      := old.reviewed_by;
  end if;
  return new;
end;
$$;
drop trigger if exists lock_club_fields on public.clubs;
create trigger lock_club_fields before update on public.clubs
  for each row execute procedure public.lock_club_privileged_fields();

-- PROFILES: non-admins can't change any role (blocks self-escalation);
-- and NO ONE can set 'special_admin' via an UPDATE: the lone special_admin
-- is minted only by bootstrap_special_admin(), which flips the GUC below.
create or replace function public.lock_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    -- The GUC is set only inside bootstrap_special_admin(); it is the single
    -- sanctioned path for minting the special_admin and must be checked
    -- first, since at bootstrap time no special_admin exists yet.
    if current_setting('app.allow_special_admin', true) = 'on' then
      null;  -- bootstrap: permitted
    elsif not public.is_special_admin() then
      new.role := old.role;  -- silently ignore self-escalation attempts
    elsif new.role = 'special_admin' and old.role <> 'special_admin' then
      raise exception 'special_admin may only be set via bootstrap_special_admin()';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_role_change on public.profiles;
create trigger prevent_role_change before update on public.profiles
  for each row execute procedure public.lock_profile_role();

-- ===========================================================================
-- 7. SPECIAL ADMIN BOOTSTRAP
--    Run ONCE from the Supabase SQL editor, after the admin has signed in
--    once so their profile row exists:
--        select public.bootstrap_special_admin('admin-name@lwsd.org');
--    Refuses if a special_admin already exists. EXECUTE is revoked from all
--    app roles, so no client (and no logged-in user) can ever call it.
-- ===========================================================================
create or replace function public.bootstrap_special_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if exists (select 1 from profiles where role = 'special_admin') then
    raise exception 'A special_admin already exists; exactly one is permitted';
  end if;
  select id into v_id from profiles where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'No profile for %; that user must sign in once first', p_email;
  end if;
  perform set_config('app.allow_special_admin', 'on', true);  -- one-shot bypass
  update profiles set role = 'special_admin' where id = v_id;
  return 'special_admin granted to ' || lower(p_email);
end;
$$;
revoke all on function public.bootstrap_special_admin(text) from public, anon, authenticated;

-- ===========================================================================
-- 8. WORKFLOW RPCs
--    The only sanctioned way to perform privileged mutations. Each one
--    re-derives the caller from auth.uid(), re-checks their role, and writes
--    an audit row. The client's claimed role is irrelevant here.
-- ===========================================================================

-- Student-initiated: ask the special_admin to verify you as a president.
create or replace function public.request_president_verification()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  update profiles
     set president_status           = 'pending',
         president_requested_at     = now(),
         president_rejection_reason = null
   where id = auth.uid()
     and role in ('student', 'verified_president')
     and (president_status is null or president_status = 'rejected');
  insert into audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'request_president_verification', 'profile', auth.uid());
end;
$$;

-- Special-admin only: approve a president (also lifts their role).
create or replace function public.verify_president(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may verify presidents';
  end if;
  update profiles
     set president_status           = 'approved',
         role                       = 'verified_president',
         president_reviewed_at      = now(),
         president_reviewed_by      = auth.uid(),
         president_rejection_reason = null
   where id = p_user_id and role in ('student', 'verified_president');
  insert into audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'verify_president', 'profile', p_user_id);
end;
$$;

-- Special-admin only: reject a president request.
create or replace function public.reject_president(p_user_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may reject presidents';
  end if;
  update profiles
     set president_status           = 'rejected',
         president_rejection_reason = p_reason,
         president_reviewed_at      = now(),
         president_reviewed_by      = auth.uid(),
         role                       = 'student'
   where id = p_user_id and role <> 'special_admin';
  insert into audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'reject_president', 'profile', p_user_id,
            jsonb_build_object('reason', p_reason));
end;
$$;

-- Special-admin only: approve a club. Approving a club also verifies its
-- submitter as a president: one action clears both gates for the common case.
create or replace function public.approve_club(p_club_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may approve clubs';
  end if;
  update clubs
     set status           = 'approved',
         rejection_reason = null,
         reviewed_at      = now(),
         reviewed_by      = auth.uid()
   where id = p_club_id
  returning created_by into v_owner;
  if v_owner is null then
    raise exception 'club not found';
  end if;
  update profiles
     set president_status      = 'approved',
         role                  = 'verified_president',
         president_reviewed_at = now(),
         president_reviewed_by = auth.uid()
   where id = v_owner and role in ('student', 'verified_president');
  insert into audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'approve_club', 'club', p_club_id);
end;
$$;

-- Special-admin only: reject a club with a reason the submitter can see.
create or replace function public.reject_club(p_club_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may reject clubs';
  end if;
  update clubs
     set status           = 'rejected',
         rejection_reason = p_reason,
         reviewed_at      = now(),
         reviewed_by      = auth.uid()
   where id = p_club_id;
  insert into audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'reject_club', 'club', p_club_id,
            jsonb_build_object('reason', p_reason));
end;
$$;

-- Special-admin only: assign a club admin by email. Promotes a plain student
-- to club_admin; never touches verified_president / special_admin roles.
create or replace function public.assign_club_admin(p_club_id uuid, p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_role public.app_role;
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may assign club admins';
  end if;
  select id, role into v_user, v_role
    from profiles where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No @lwsd.org account found for % (they must sign in once first)', p_email;
  end if;
  insert into club_admins (club_id, user_id)
    values (p_club_id, v_user)
    on conflict (club_id, user_id) do nothing;
  if v_role = 'student' then
    update profiles set role = 'club_admin' where id = v_user;
  end if;
  insert into audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'assign_club_admin', 'club', p_club_id,
            jsonb_build_object('user', v_user, 'email', lower(p_email)));
  return 'club admin added: ' || lower(p_email);
end;
$$;

-- Special-admin only: remove a club admin. Demotes them to student if they
-- no longer administer any club (and aren't a higher role).
create or replace function public.remove_club_admin(p_club_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may remove club admins';
  end if;
  delete from club_admins where club_id = p_club_id and user_id = p_user_id;
  if not exists (select 1 from club_admins where user_id = p_user_id) then
    update profiles set role = 'student'
      where id = p_user_id and role = 'club_admin';
  end if;
  insert into audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'remove_club_admin', 'club', p_club_id,
            jsonb_build_object('user', p_user_id));
end;
$$;

-- Read the admin roster of a club without opening `profiles` to non-admins.
create or replace function public.list_club_admins(p_club_id uuid)
returns table (user_id uuid, email text, display_name text)
language sql stable security definer set search_path = public as $$
  select ca.user_id, p.email, p.display_name
  from club_admins ca
  join profiles p on p.id = ca.user_id
  where ca.club_id = p_club_id
    and public.can_admin_club(p_club_id)
$$;

-- Grants: every workflow RPC is callable by signed-in users; the role check
-- lives *inside* each function, so a student calling an admin RPC just hits
-- the raised exception.
grant execute on function public.request_president_verification()        to authenticated;
grant execute on function public.verify_president(uuid)                  to authenticated;
grant execute on function public.reject_president(uuid, text)            to authenticated;
grant execute on function public.approve_club(uuid)                      to authenticated;
grant execute on function public.reject_club(uuid, text)                 to authenticated;
grant execute on function public.assign_club_admin(uuid, text)           to authenticated;
grant execute on function public.remove_club_admin(uuid, uuid)           to authenticated;
grant execute on function public.list_club_admins(uuid)                  to authenticated;
grant execute on function public.my_app_role()                          to authenticated;
