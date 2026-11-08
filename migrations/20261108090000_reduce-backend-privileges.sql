-- Close direct access paths without expanding writes to protected tables.
-- Ownership changes, moderation and public review projections still need
-- guarded SECURITY DEFINER routines; changing them to invoker would break RLS.

alter function public.my_app_role() security invoker;
alter function public.my_club_access(uuid) security invoker;
alter function public.list_club_claims() security invoker;
alter function public.dashboard_feed(integer) security invoker;
alter function public.mark_notifications_read(bigint[]) security invoker;
alter function public.set_notification_preferences(uuid,boolean,boolean,boolean,boolean,boolean) security invoker;

-- A notification caller can only change its read timestamp, not its identity,
-- payload, or any server-generated data. Existing owner RLS still applies.
revoke update on public.notifications from public, anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Anonymous directory reads need no privileged authorization helpers.
alter policy "clubs read approved or own" on public.clubs to authenticated;
create policy "guests read approved clubs" on public.clubs
  for select to anon using (status = 'approved');
alter policy "events readable" on public.club_events to authenticated;
create policy "guests read public events" on public.club_events
  for select to anon using (
    exists (select 1 from public.clubs c where c.id = club_id
      and c.status = 'approved' and c.is_active)
  );
alter policy "announcements readable" on public.announcements to authenticated;
create policy "guests read public Canvas links" on public.announcements
  for select to anon using (
    club_id is null or exists (select 1 from public.clubs c
      where c.id = club_id and c.status = 'approved')
  );

-- The public search uses the caller's RLS instead of bypassing it. The files
-- and notes tables already enforce membership, including for old API clients.
do $$
declare original text; revised text;
begin
  original := pg_get_functiondef('public.search_platform(text,integer)'::regprocedure);
  if strpos(original, 'public.is_club_member(f.club_id)') = 0
     or strpos(original, 'public.is_club_member(n.club_id)') = 0 then
    raise exception 'Unexpected search definition; review its authorization before migration';
  end if;
  revised := replace(replace(original, 'public.is_club_member(f.club_id)', 'auth.uid() is not null'),
    'public.is_club_member(n.club_id)', 'auth.uid() is not null');
  execute revised;
end $$;
alter function public.search_platform(text,integer) security invoker;

revoke execute on function public.my_app_role(), public.is_special_admin(),
  public.can_admin_club(uuid), public.is_club_member(uuid), public.has_club_permission(uuid,text)
  from public, anon;
grant execute on function public.my_app_role(), public.is_special_admin(),
  public.can_admin_club(uuid), public.is_club_member(uuid), public.has_club_permission(uuid,text)
  to authenticated;

-- Preserve the messaging archive, with explicit deny policies even if someone
-- accidentally grants a table privilege in the future.
do $$
declare target text; old_policy record;
begin
  foreach target in array array['club_messages', 'direct_messages',
      'message_identity_keys', 'message_blocks', 'student_directory'] loop
    execute format('revoke all on public.%I from public, anon, authenticated', target);
    for old_policy in select policyname from pg_policies
      where schemaname = 'public' and tablename = target loop
      execute format('drop policy %I on public.%I', old_policy.policyname, target);
    end loop;
    execute format('create policy archive_no_app_access on public.%I as restrictive for all to anon, authenticated using (false) with check (false)', target);
  end loop;
end $$;

create index if not exists message_blocks_blocked_id_idx on public.message_blocks(blocked_id);
-- The app uses substring search, not the tsvector expression this index covers.
-- Keep FK, inbox, and queue indexes even when scan counts are temporarily zero.
drop index if exists public.clubs_search_idx;
