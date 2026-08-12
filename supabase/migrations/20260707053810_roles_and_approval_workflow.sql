-- Applied to production 2026-07-07. Recovered from
-- supabase_migrations.schema_migrations; it was never committed to this repo,
-- which is why 001_initial_schema.sql no longer describes the live database.
--
-- Replaces the `super_admin` role with a single `special_admin`, adds the club
-- approval + club-president verification workflows, and moves clubs from a
-- boolean `approved` flag to an `approval_status` enum.
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

do $$
begin
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type public.approval_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

alter table public.profiles
  add column if not exists president_status          public.approval_status,
  add column if not exists president_requested_at    timestamptz,
  add column if not exists president_reviewed_at     timestamptz,
  add column if not exists president_reviewed_by     uuid references public.profiles(id),
  add column if not exists president_rejection_reason text;

alter table public.clubs
  add column if not exists status           public.approval_status not null default 'pending',
  add column if not exists president_id     uuid references public.profiles(id),
  add column if not exists president_email  text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at      timestamptz,
  add column if not exists reviewed_by      uuid references public.profiles(id);

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

update public.clubs set president_id = created_by where president_id is null;

create or replace function public.is_special_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'special_admin'
  )
$$;

create or replace function public.is_super_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select public.is_special_admin()
$$;

create or replace function public.my_app_role() returns public.app_role
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

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

drop policy if exists "approved clubs readable" on public.clubs;
drop policy if exists "clubs read approved or own" on public.clubs;
create policy "clubs read approved or own" on public.clubs
  for select using (
    status = 'approved'
    or created_by = auth.uid()
    or public.can_admin_club(id)
  );

drop policy if exists "users submit clubs"   on public.clubs;
drop policy if exists "clubs submit pending" on public.clubs;
create policy "clubs submit pending" on public.clubs
  for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements
  for select using (
    exists (
      select 1 from public.clubs c
      where c.id = club_id and c.status = 'approved'
    )
    or public.can_admin_club(club_id)
  );

drop policy if exists "club admins visible to managers" on public.club_admins;
create policy "club admins visible to managers" on public.club_admins
  for select using (public.can_admin_club(club_id) or user_id = auth.uid());

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

create or replace function public.lock_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if current_setting('app.allow_special_admin', true) = 'on' then
      null;
    elsif not public.is_special_admin() then
      new.role := old.role;
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

create or replace function public.bootstrap_special_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if exists (select 1 from profiles where role = 'special_admin') then
    raise exception 'A special_admin already exists; exactly one is permitted';
  end if;
  select id into v_id from profiles where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'No profile for % — that user must sign in once first', p_email;
  end if;
  perform set_config('app.allow_special_admin', 'on', true);
  update profiles set role = 'special_admin' where id = v_id;
  return 'special_admin granted to ' || lower(p_email);
end;
$$;
revoke all on function public.bootstrap_special_admin(text) from public, anon, authenticated;

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

create or replace function public.list_club_admins(p_club_id uuid)
returns table (user_id uuid, email text, display_name text)
language sql stable security definer set search_path = public as $$
  select ca.user_id, p.email, p.display_name
  from club_admins ca
  join profiles p on p.id = ca.user_id
  where ca.club_id = p_club_id
    and public.can_admin_club(p_club_id)
$$;

grant execute on function public.request_president_verification()        to authenticated;
grant execute on function public.verify_president(uuid)                  to authenticated;
grant execute on function public.reject_president(uuid, text)            to authenticated;
grant execute on function public.approve_club(uuid)                      to authenticated;
grant execute on function public.reject_club(uuid, text)                 to authenticated;
grant execute on function public.assign_club_admin(uuid, text)           to authenticated;
grant execute on function public.remove_club_admin(uuid, uuid)           to authenticated;
grant execute on function public.list_club_admins(uuid)                  to authenticated;
grant execute on function public.my_app_role()                           to authenticated;
