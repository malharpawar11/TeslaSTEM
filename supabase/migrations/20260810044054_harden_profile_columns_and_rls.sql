-- 1. Server-owned profile columns -----------------------------------------
-- Previously the "update own profile" policy allowed a signed-in user to write
-- ANY column of their own profile row; only `role` was protected by a trigger.
-- A student could therefore self-set president_status='approved' (poisoning the
-- special_admin review queue) or rewrite their own `email` (the @lwsd.org gate).
-- The trigger below locks every server-owned column unless the writer is the
-- special_admin, or the write comes from a privileged SECURITY DEFINER RPC that
-- opts in via the app.privileged_profile_write flag.
create or replace function public.lock_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_special    boolean := public.is_special_admin();
  v_privileged boolean := coalesce(current_setting('app.privileged_profile_write', true), '') = 'on';
begin
  if new.role is distinct from old.role then
    if current_setting('app.allow_special_admin', true) = 'on' then
      null;
    elsif not v_special then
      new.role := old.role;
    elsif new.role = 'special_admin' and old.role <> 'special_admin' then
      raise exception 'special_admin may only be set via bootstrap_special_admin()';
    end if;
  end if;

  if not v_special and not v_privileged then
    new.id                         := old.id;
    new.email                      := old.email;
    new.created_at                 := old.created_at;
    new.president_status           := old.president_status;
    new.president_requested_at     := old.president_requested_at;
    new.president_reviewed_at      := old.president_reviewed_at;
    new.president_reviewed_by      := old.president_reviewed_by;
    new.president_rejection_reason := old.president_rejection_reason;
  end if;

  return new;
end;
$$;

-- request_president_verification is called by a student, so it must opt in to
-- the privileged write above or its own update would be silently reverted.
create or replace function public.request_president_verification()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  perform set_config('app.privileged_profile_write', 'on', true);
  update profiles
     set president_status           = 'pending',
         president_requested_at     = now(),
         president_rejection_reason = null
   where id = auth.uid()
     and role in ('student', 'verified_president')
     and (president_status is null or president_status = 'rejected');
  perform set_config('app.privileged_profile_write', 'off', true);
  insert into audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'request_president_verification', 'profile', auth.uid());
end;
$$;

-- 2. Missing foreign-key indexes -------------------------------------------
create index if not exists announcements_created_by_idx    on public.announcements (created_by);
create index if not exists audit_logs_actor_created_idx    on public.audit_logs (actor, created_at desc);
create index if not exists club_admins_user_idx            on public.club_admins (user_id);
create index if not exists club_followers_user_idx         on public.club_followers (user_id);
create index if not exists clubs_created_by_idx            on public.clubs (created_by);
create index if not exists clubs_president_idx             on public.clubs (president_id);
create index if not exists clubs_reviewed_by_idx           on public.clubs (reviewed_by);
create index if not exists clubs_status_idx                on public.clubs (status);
create index if not exists profiles_president_status_idx   on public.profiles (president_status);
create index if not exists profiles_president_reviewed_idx on public.profiles (president_reviewed_by);

-- 3. clubs.updated_at was never maintained ---------------------------------
-- NOTE: search_path is pinned and EXECUTE revoked in
-- 20260812082958_fix_touch_updated_at_search_path.sql.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists set_clubs_updated_at on public.clubs;
create trigger set_clubs_updated_at before update on public.clubs
  for each row execute function public.touch_updated_at();
