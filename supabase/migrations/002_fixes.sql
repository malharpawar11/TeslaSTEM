-- 002_fixes.sql — corrects gaps found in 001_initial_schema.sql.
-- Safe to run after 001. Re-runnable: every object is dropped-if-exists first.

-- ---------------------------------------------------------------------------
-- 1. Clubs INSERT path for normal @lwsd.org users (the Submit tab).
--    001 had no FOR INSERT policy, so RLS blocked every non-super user from
--    creating a club. New clubs stay approved=false; supers still gate them.
-- ---------------------------------------------------------------------------
drop policy if exists "users submit clubs" on public.clubs;
create policy "users submit clubs" on public.clubs
  for insert to authenticated
  with check (created_by = auth.uid() and approved = false);

-- ---------------------------------------------------------------------------
-- 2. Audit logging via SECURITY DEFINER RPC instead of a super-only INSERT
--    policy. Any authenticated user can record an action *as themselves*;
--    the function — not the caller — owns the insert, so RLS no longer
--    blocks club-admin actions. Direct client INSERTs stay super-only.
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'log_audit requires an authenticated user';
  end if;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;
revoke all on function public.log_audit(text, text, uuid, jsonb) from public;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. profiles UPDATE: 001's WITH CHECK subqueried profiles from inside a
--    profiles policy (recursion / racy snapshot risk). Replace with a plain
--    self-row policy and lock `role` changes in a BEFORE UPDATE trigger.
-- ---------------------------------------------------------------------------
drop policy if exists "update own profile limited" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.lock_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and not public.is_super_admin() then
    new.role := old.role; -- silently ignore self-escalation attempts
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_role_change on public.profiles;
create trigger prevent_role_change before update on public.profiles
  for each row execute procedure public.lock_profile_role();

-- ---------------------------------------------------------------------------
-- 4. Announcements: let club admins read their own club's announcements even
--    before the club is approved, and allow them to delete announcements.
-- ---------------------------------------------------------------------------
drop policy if exists "announcements readable for approved clubs" on public.announcements;
create policy "announcements readable" on public.announcements
  for select using (
    exists (select 1 from public.clubs c where c.id = club_id and c.approved)
    or public.can_admin_club(club_id)
  );

drop policy if exists "admins delete own club announcements" on public.announcements;
create policy "admins delete own club announcements" on public.announcements
  for delete using (public.can_admin_club(club_id));

-- ---------------------------------------------------------------------------
-- 5. Storage: scope club-assets writes to authenticated @lwsd.org users and
--    let them replace/remove their own uploads (001 only allowed insert).
-- ---------------------------------------------------------------------------
drop policy if exists "club asset owner update" on storage.objects;
create policy "club asset owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'club-assets' and owner = auth.uid())
  with check (bucket_id = 'club-assets' and owner = auth.uid());

drop policy if exists "club asset owner delete" on storage.objects;
create policy "club asset owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'club-assets' and owner = auth.uid());
