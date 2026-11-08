-- Retire both messaging implementations and their student directory.
-- Keep the historical rows inaccessible to app roles pending a retention decision.
revoke all on public.direct_messages, public.club_messages,
  public.message_identity_keys, public.message_blocks, public.student_directory
  from public, anon, authenticated;

do $$
declare endpoint regprocedure;
begin
  for endpoint in
    select p.oid::regprocedure from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'messaging_account', 'save_directory_profile', 'search_students',
      'direct_contact', 'send_direct_message', 'direct_history', 'direct_inbox',
      'read_direct_messages', 'read_visible_direct_messages', 'block_message_user',
      'can_message_pair', 'message_contacts', 'send_club_message',
      'message_history', 'message_history_page', 'message_threads',
      'read_club_messages', 'my_message_vault', 'register_message_vault',
      'message_peer_key', 'send_encrypted_club_message', 'notify_direct_message'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', endpoint);
  end loop;
end $$;

drop trigger if exists direct_messages_live on public.direct_messages;
drop policy if exists "own student inbox subscription" on realtime.channels;
update realtime.channels set enabled = false where pattern = 'student-inbox:%';

-- Existing announcement bodies are kept as an archive; only Canvas permalinks
-- are readable or writable by the app going forward.
create function public.is_canvas_announcement_link(value text)
returns boolean language sql immutable strict security invoker
set search_path = pg_catalog
as $$
  select length(value) <= 500 and value ~*
    '^https://[a-z0-9][a-z0-9-]*\.instructure\.com/(courses|groups)/[0-9]+/(discussion_topics|announcements)/[0-9]+/?$'
$$;

revoke all on function public.is_canvas_announcement_link(text) from public;
grant execute on function public.is_canvas_announcement_link(text) to anon, authenticated;

alter table public.announcements add constraint announcement_canvas_link_only
  check (public.is_canvas_announcement_link(body)) not valid;

create policy "only Canvas announcement links" on public.announcements
  as restrictive for select to anon, authenticated
  using (public.is_canvas_announcement_link(body));

-- Keep live list refreshes, but Canvas owns announcement delivery.
drop trigger if exists announcements_notify on public.announcements;
create policy "Canvas handles announcement alerts" on public.notifications
  as restrictive for select to anon, authenticated
  using (type not in ('announcement', 'school_announcement'));

-- Aggregate functions bypass RLS; filter the archive there too. Preserve the
-- existing date-only event handling, membership scoping, and limit caps.
do $$
declare dashboard text; search text;
begin
  dashboard := pg_get_functiondef('public.dashboard_feed(integer)'::regprocedure);
  search := pg_get_functiondef('public.search_platform(text,integer)'::regprocedure);
  if strpos(dashboard, 'where an.club_id is null or an.club_id in (select id from my_clubs)') = 0
    or strpos(dashboard, 'where nt.user_id = auth.uid()') = 0
    or strpos(dashboard, 'where user_id = auth.uid() and read_at is null') = 0
    or strpos(search, 'where (a.title ilike q.pattern or a.body ilike q.pattern)') = 0 then
    raise exception 'Unexpected aggregate definitions; Canvas archive filtering not applied';
  end if;
  dashboard := replace(dashboard,
    'where an.club_id is null or an.club_id in (select id from my_clubs)',
    'where public.is_canvas_announcement_link(an.body) and (an.club_id is null or an.club_id in (select id from my_clubs where status = ''active''))');
  dashboard := replace(dashboard, 'where nt.user_id = auth.uid()',
    'where nt.user_id = auth.uid() and nt.type not in (''announcement'', ''school_announcement'')');
  dashboard := replace(dashboard, 'where user_id = auth.uid() and read_at is null',
    'where user_id = auth.uid() and read_at is null and type not in (''announcement'', ''school_announcement'')');
  search := replace(search, 'where (a.title ilike q.pattern or a.body ilike q.pattern)',
    'where public.is_canvas_announcement_link(a.body) and a.title ilike q.pattern');
  execute dashboard;
  execute search;
end $$;
