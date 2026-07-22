-- Tesla STEM Clubs — full schema on InsForge.
-- Ported from the old Supabase migrations (001/002/003), adapted to
-- InsForge's auth.users conventions. LWSD-only enforcement happens in TWO
-- places: the app's sign-up form (UX) and a BEFORE INSERT trigger on
-- auth.users (the real gate — a tampered client still cannot create a
-- non-@lwsd.org account).

-- ===========================================================================
-- 1. ENUMS
-- ===========================================================================
create type public.app_role as enum ('special_admin', 'verified_president', 'club_admin', 'student');
create type public.approval_status as enum ('pending', 'approved', 'rejected');

-- ===========================================================================
-- 2. TABLES
-- ===========================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (right(lower(email), 9) = '@lwsd.org'),
  display_name text,
  role public.app_role not null default 'student',
  president_status public.approval_status,
  president_requested_at timestamptz,
  president_reviewed_at timestamptz,
  president_reviewed_by uuid references public.profiles(id),
  president_rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null,
  meeting_day text,
  meeting_time text,
  location text,
  advisor text,
  contact_email text,
  status public.approval_status not null default 'pending',
  created_by uuid references public.profiles(id),
  president_id uuid references public.profiles(id),
  president_email text,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_admins (
  club_id uuid references public.clubs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (club_id, user_id)
);

create table public.club_followers (
  club_id uuid references public.clubs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  expo_push_token text,
  primary key (club_id, user_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  title text not null,
  body text not null,
  approved_for_school_wide boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigserial primary key,
  actor uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index clubs_search_idx on public.clubs
  using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(description, '') || ' ' || coalesce(advisor, '')));
create index announcements_club_created_idx on public.announcements (club_id, created_at desc);

-- ===========================================================================
-- 3. ROW LEVEL SECURITY
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_admins enable row level security;
alter table public.club_followers enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

-- No one signs up as anonymous into these tables directly — only the
-- handle_new_user() trigger (SECURITY DEFINER, owner-bypass) creates profile
-- rows, and only the workflow RPCs below mutate role/status columns.
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
revoke insert, update, delete on public.club_admins from anon, authenticated;

-- ===========================================================================
-- 4. ROLE-CHECK HELPERS (SECURITY DEFINER so RLS on `profiles` never hides
--    the caller's own role from an authorization check)
-- ===========================================================================
create or replace function public.is_special_admin() returns boolean
  language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'special_admin')
$$;

create or replace function public.my_app_role() returns public.app_role
  language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select role from public.profiles where id = auth.uid()
$$;

-- A user may administer a club if they are the special_admin, an assigned
-- club_admin, OR the club's own verified president.
create or replace function public.can_admin_club(c uuid) returns boolean
  language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select public.is_special_admin()
      or exists (select 1 from public.club_admins where club_id = c and user_id = auth.uid())
      or exists (
           select 1 from public.clubs cl
           join public.profiles p on p.id = auth.uid()
           where cl.id = c and cl.president_id = auth.uid() and p.role = 'verified_president'
         )
$$;

grant execute on function public.is_special_admin() to authenticated;
grant execute on function public.my_app_role() to authenticated;
grant execute on function public.can_admin_club(uuid) to authenticated;

-- ===========================================================================
-- 5. POLICIES
-- ===========================================================================

-- PROFILES: read your own row, or every row if you're the special admin.
create policy "read own profile or special admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_special_admin());

-- CLUBS: the public (incl. anon browsing) sees only approved clubs. A
-- submitter and a club's admins additionally see their own pending/rejected
-- clubs to track them.
create policy "clubs read approved or own" on public.clubs
  for select to anon, authenticated
  using (status = 'approved' or created_by = auth.uid() or public.can_admin_club(id));

-- CLUBS: any signed-in @lwsd.org user may submit, but only as a `pending`
-- club they own.
create policy "clubs submit pending" on public.clubs
  for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

-- CLUBS: owners/admins may update; privileged fields are locked by trigger
-- below so only the special_admin can actually change status/ownership.
create policy "clubs update by admins" on public.clubs
  for update to authenticated
  using (public.can_admin_club(id))
  with check (public.can_admin_club(id));

-- CLUB_ADMINS: club managers see their own roster; writes are RPC-only.
create policy "club admins visible to managers" on public.club_admins
  for select to authenticated
  using (public.can_admin_club(club_id) or user_id = auth.uid());

-- CLUB_FOLLOWERS: users manage their own follows; admins can see who follows.
create policy "followers manage own follows" on public.club_followers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admins see followers" on public.club_followers
  for select to authenticated
  using (public.can_admin_club(club_id));

-- ANNOUNCEMENTS: readable once the club is approved, or to that club's admins.
create policy "announcements readable" on public.announcements
  for select to anon, authenticated
  using (
    exists (select 1 from public.clubs c where c.id = club_id and c.status = 'approved')
    or public.can_admin_club(club_id)
  );

create policy "admins create club announcements" on public.announcements
  for insert to authenticated
  with check (public.can_admin_club(club_id) and created_by = auth.uid());

create policy "admins update own club announcements" on public.announcements
  for update to authenticated
  using (public.can_admin_club(club_id))
  with check (public.can_admin_club(club_id));

create policy "admins delete own club announcements" on public.announcements
  for delete to authenticated
  using (public.can_admin_club(club_id));

-- AUDIT_LOGS: only the special admin can read; writes only via log_audit().
create policy "special admin audit read" on public.audit_logs
  for select to authenticated
  using (public.is_special_admin());

-- ===========================================================================
-- 6. COLUMN-LOCK TRIGGERS — defence in depth
-- ===========================================================================

-- CLUBS: only the special_admin may change status / ownership / review data.
create or replace function public.lock_club_privileged_fields()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if not public.is_special_admin() then
    new.status := old.status;
    new.created_by := old.created_by;
    new.president_id := old.president_id;
    new.rejection_reason := old.rejection_reason;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;
  return new;
end;
$$;
create trigger lock_club_fields before update on public.clubs
  for each row execute procedure public.lock_club_privileged_fields();

-- PROFILES: no one can self-escalate; 'special_admin' can only be minted by
-- bootstrap_special_admin(), which briefly disables this trigger (session
-- GUC flags are unavailable through the pooled connection, so a session
-- config flag isn't an option here).
create or replace function public.lock_profile_role()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if new.role is distinct from old.role then
    if not public.is_special_admin() then
      new.role := old.role;
    elsif new.role = 'special_admin' and old.role <> 'special_admin' then
      raise exception 'special_admin may only be set via bootstrap_special_admin()';
    end if;
  end if;
  return new;
end;
$$;
create trigger prevent_role_change before update on public.profiles
  for each row execute procedure public.lock_profile_role();

-- ===========================================================================
-- 7. SIGN-UP HOOK — enforce @lwsd.org and provision the profile row
-- ===========================================================================
create or replace function public.enforce_lwsd_email()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if right(lower(new.email), 9) <> '@lwsd.org' then
    raise exception 'Only @lwsd.org Lake Washington School District accounts may sign up.';
  end if;
  return new;
end;
$$;
create trigger enforce_lwsd_email_on_signup before insert on auth.users
  for each row execute procedure public.enforce_lwsd_email();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.profile->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===========================================================================
-- 8. SPECIAL ADMIN BOOTSTRAP
--    Run ONCE, after the admin has signed up and verified their email so
--    their profile row exists:
--        select public.bootstrap_special_admin('admin-name@lwsd.org');
--    EXECUTE is revoked from every app role, so no client can ever call it.
-- ===========================================================================
create or replace function public.bootstrap_special_admin(p_email text)
returns text language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'special_admin') then
    raise exception 'A special_admin already exists; exactly one is permitted';
  end if;
  select id into v_id from public.profiles where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'No profile for % — that user must sign up first', p_email;
  end if;
  alter table public.profiles disable trigger prevent_role_change;
  update public.profiles set role = 'special_admin' where id = v_id;
  alter table public.profiles enable trigger prevent_role_change;
  return 'special_admin granted to ' || lower(p_email);
end;
$$;
revoke all on function public.bootstrap_special_admin(text) from public, anon, authenticated;

-- ===========================================================================
-- 9. WORKFLOW RPCs — the only sanctioned way to perform privileged
--    mutations. Each re-derives the caller from auth.uid(), re-checks role,
--    and writes an audit row.
-- ===========================================================================

create or replace function public.log_audit(
  p_action text, p_entity text, p_entity_id uuid default null, p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'log_audit requires an authenticated user';
  end if;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.request_president_verification()
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  update public.profiles
     set president_status = 'pending', president_requested_at = now(), president_rejection_reason = null
   where id = auth.uid() and role in ('student', 'verified_president')
     and (president_status is null or president_status = 'rejected');
  insert into public.audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'request_president_verification', 'profile', auth.uid());
end;
$$;

create or replace function public.verify_president(p_user_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may verify presidents';
  end if;
  update public.profiles
     set president_status = 'approved', role = 'verified_president',
         president_reviewed_at = now(), president_reviewed_by = auth.uid(), president_rejection_reason = null
   where id = p_user_id and role in ('student', 'verified_president');
  insert into public.audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'verify_president', 'profile', p_user_id);
end;
$$;

create or replace function public.reject_president(p_user_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may reject presidents';
  end if;
  update public.profiles
     set president_status = 'rejected', president_rejection_reason = p_reason,
         president_reviewed_at = now(), president_reviewed_by = auth.uid(), role = 'student'
   where id = p_user_id and role <> 'special_admin';
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'reject_president', 'profile', p_user_id, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.approve_club(p_club_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_owner uuid;
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may approve clubs';
  end if;
  update public.clubs
     set status = 'approved', rejection_reason = null, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_club_id
  returning created_by into v_owner;
  if v_owner is null then
    raise exception 'club not found';
  end if;
  update public.profiles
     set president_status = 'approved', role = 'verified_president',
         president_reviewed_at = now(), president_reviewed_by = auth.uid()
   where id = v_owner and role in ('student', 'verified_president');
  insert into public.audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'approve_club', 'club', p_club_id);
end;
$$;

create or replace function public.reject_club(p_club_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may reject clubs';
  end if;
  update public.clubs
     set status = 'rejected', rejection_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_club_id;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'reject_club', 'club', p_club_id, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.assign_club_admin(p_club_id uuid, p_email text)
returns text language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_user uuid; v_role public.app_role;
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may assign club admins';
  end if;
  select id, role into v_user, v_role from public.profiles where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No @lwsd.org account found for % (they must sign up first)', p_email;
  end if;
  insert into public.club_admins (club_id, user_id) values (p_club_id, v_user) on conflict (club_id, user_id) do nothing;
  if v_role = 'student' then
    update public.profiles set role = 'club_admin' where id = v_user;
  end if;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'assign_club_admin', 'club', p_club_id, jsonb_build_object('user', v_user, 'email', lower(p_email)));
  return 'club admin added: ' || lower(p_email);
end;
$$;

create or replace function public.remove_club_admin(p_club_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the special_admin may remove club admins';
  end if;
  delete from public.club_admins where club_id = p_club_id and user_id = p_user_id;
  if not exists (select 1 from public.club_admins where user_id = p_user_id) then
    update public.profiles set role = 'student' where id = p_user_id and role = 'club_admin';
  end if;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'remove_club_admin', 'club', p_club_id, jsonb_build_object('user', p_user_id));
end;
$$;

create or replace function public.list_club_admins(p_club_id uuid)
returns table (user_id uuid, email text, display_name text)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select ca.user_id, p.email, p.display_name
  from public.club_admins ca
  join public.profiles p on p.id = ca.user_id
  where ca.club_id = p_club_id and public.can_admin_club(p_club_id)
$$;

grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;
grant execute on function public.request_president_verification() to authenticated;
grant execute on function public.verify_president(uuid) to authenticated;
grant execute on function public.reject_president(uuid, text) to authenticated;
grant execute on function public.approve_club(uuid) to authenticated;
grant execute on function public.reject_club(uuid, text) to authenticated;
grant execute on function public.assign_club_admin(uuid, text) to authenticated;
grant execute on function public.remove_club_admin(uuid, uuid) to authenticated;
grant execute on function public.list_club_admins(uuid) to authenticated;
