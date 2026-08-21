-- 14. AGGREGATE READS: dashboard and search
--     One round trip each, and every branch is scoped to what the caller is
--     actually allowed to see.
-- ===========================================================================
create or replace function public.dashboard_feed(p_limit integer default 10)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, pg_temp as $$
  with my_clubs as (
    select c.id, c.name, c.category, c.logo_url, c.member_count,
           m.role::text as role, m.position, m.status::text as status
      from public.club_members m
      join public.clubs c on c.id = m.club_id
     where m.user_id = auth.uid() and m.status in ('active', 'pending')
  )
  select jsonb_build_object(
    'clubs', (select coalesce(jsonb_agg(to_jsonb(mc) order by mc.name), '[]'::jsonb) from my_clubs mc),
    'events', (
      select coalesce(jsonb_agg(e), '[]'::jsonb) from (
        select jsonb_build_object(
                 'id', ev.id, 'club_id', ev.club_id, 'club_name', c.name, 'title', ev.title,
                 'description', ev.description, 'event_type', ev.event_type,
                 'starts_at', ev.starts_at, 'ends_at', ev.ends_at, 'location', ev.location,
                 'organizer', ev.organizer, 'status', ev.status) e
          from public.club_events ev
          join public.clubs c on c.id = ev.club_id
         where ev.club_id in (select id from my_clubs)
           and ev.status = 'scheduled' and ev.starts_at >= now() - interval '2 hours'
         order by ev.starts_at
         limit p_limit
      ) t
    ),
    'announcements', (
      select coalesce(jsonb_agg(a), '[]'::jsonb) from (
        select jsonb_build_object(
                 'id', an.id, 'club_id', an.club_id,
                 'club_name', coalesce(c.name, 'Tesla STEM'), 'title', an.title, 'body', an.body,
                 'created_at', an.created_at,
                 'author', coalesce(p.display_name, p.email)) a
          from public.announcements an
          left join public.clubs c on c.id = an.club_id
          left join public.profiles p on p.id = an.created_by
         where an.club_id is null or an.club_id in (select id from my_clubs)
         order by an.created_at desc
         limit p_limit
      ) t
    ),
    'files', (
      select coalesce(jsonb_agg(f), '[]'::jsonb) from (
        select jsonb_build_object(
                 'id', cf.id, 'club_id', cf.club_id, 'club_name', c.name, 'title', cf.title,
                 'folder', cf.folder, 'file_url', cf.file_url, 'mime_type', cf.mime_type,
                 'created_at', cf.created_at) f
          from public.club_files cf
          join public.clubs c on c.id = cf.club_id
         where cf.club_id in (select id from my_clubs where status = 'active')
         order by cf.created_at desc
         limit p_limit
      ) t
    ),
    'notifications', (
      select coalesce(jsonb_agg(n), '[]'::jsonb) from (
        select jsonb_build_object(
                 'id', nt.id, 'club_id', nt.club_id, 'type', nt.type, 'title', nt.title,
                 'body', nt.body, 'entity_id', nt.entity_id, 'read_at', nt.read_at,
                 'created_at', nt.created_at) n
          from public.notifications nt
         where nt.user_id = auth.uid()
         order by nt.created_at desc
         limit p_limit
      ) t
    ),
    'unread_count', (
      select count(*) from public.notifications
       where user_id = auth.uid() and read_at is null
    )
  )
$$;

create or replace function public.search_platform(p_query text, p_limit integer default 8)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, pg_temp as $$
  with q as (select '%' || trim(coalesce(p_query, '')) || '%' as pattern)
  select jsonb_build_object(
    'clubs', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', c.id, 'name', c.name, 'category', c.category,
                                  'description', c.description, 'logo_url', c.logo_url) x
          from public.clubs c, q
         where c.status = 'approved' and c.is_active
           and (c.name ilike q.pattern or c.description ilike q.pattern
                or c.category ilike q.pattern or coalesce(c.advisor, '') ilike q.pattern)
         order by c.name limit p_limit
      ) t
    ),
    'announcements', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', a.id, 'club_id', a.club_id,
                                  'club_name', coalesce(c.name, 'Tesla STEM'),
                                  'title', a.title, 'body', a.body, 'created_at', a.created_at) x
          from public.announcements a
          left join public.clubs c on c.id = a.club_id, q
         where (a.title ilike q.pattern or a.body ilike q.pattern)
           and (a.club_id is null
                or exists (select 1 from public.clubs cc
                            where cc.id = a.club_id and cc.status = 'approved'))
         order by a.created_at desc limit p_limit
      ) t
    ),
    'events', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', e.id, 'club_id', e.club_id, 'club_name', c.name,
                                  'title', e.title, 'description', e.description,
                                  'starts_at', e.starts_at, 'ends_at', e.ends_at,
                                  'location', e.location, 'event_type', e.event_type,
                                  'organizer', e.organizer, 'status', e.status) x
          from public.club_events e
          join public.clubs c on c.id = e.club_id, q
         where c.status = 'approved' and c.is_active
           and (e.title ilike q.pattern or coalesce(e.description, '') ilike q.pattern
                or coalesce(e.location, '') ilike q.pattern)
         order by e.starts_at desc limit p_limit
      ) t
    ),
    'files', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', f.id, 'club_id', f.club_id, 'club_name', c.name,
                                  'title', f.title, 'folder', f.folder, 'file_url', f.file_url,
                                  'mime_type', f.mime_type, 'created_at', f.created_at) x
          from public.club_files f
          join public.clubs c on c.id = f.club_id, q
         where public.is_club_member(f.club_id)
           and (f.title ilike q.pattern or coalesce(f.description, '') ilike q.pattern
                or f.folder ilike q.pattern)
         order by f.created_at desc limit p_limit
      ) t
    ),
    'notes', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', n.id, 'club_id', n.club_id, 'club_name', c.name,
                                  'title', n.title, 'body', n.body, 'category', n.category,
                                  'updated_at', n.updated_at) x
          from public.club_notes n
          join public.clubs c on c.id = n.club_id, q
         where public.is_club_member(n.club_id)
           and (n.title ilike q.pattern or n.body ilike q.pattern or n.category ilike q.pattern)
         order by n.updated_at desc limit p_limit
      ) t
    )
  )
$$;

grant execute on function public.join_club(uuid) to authenticated;
grant execute on function public.leave_club(uuid) to authenticated;
grant execute on function public.request_board_role(uuid, text, text) to authenticated;
grant execute on function public.review_board_request(uuid, uuid, boolean, text, text[], text) to authenticated;
grant execute on function public.review_join_request(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.set_member_permissions(uuid, uuid, text, text[]) to authenticated;
grant execute on function public.remove_club_member(uuid, uuid) to authenticated;
grant execute on function public.list_club_members(uuid) to authenticated;
grant execute on function public.my_club_access(uuid) to authenticated;
grant execute on function public.claim_club(uuid, text, text) to authenticated;
grant execute on function public.review_club_claim(uuid, boolean, text) to authenticated;
grant execute on function public.list_club_claims() to authenticated;
grant execute on function public.transfer_club_ownership(uuid, text) to authenticated;
grant execute on function public.set_club_active(uuid, boolean) to authenticated;
grant execute on function public.set_notification_preferences(uuid, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;
grant execute on function public.dashboard_feed(integer) to authenticated;
grant execute on function public.search_platform(text, integer) to anon, authenticated;

-- Fan-out helpers are internal: only the triggers and RPCs above may call them.
revoke all on function public.notify_club_members(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.notify_club_managers(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.wants_notification(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.sync_club_member_count() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.lock_notification_fields() from public, anon, authenticated;
revoke all on function public.on_announcement_created() from public, anon, authenticated;
revoke all on function public.on_event_written() from public, anon, authenticated;
revoke all on function public.on_file_uploaded() from public, anon, authenticated;
revoke all on function public.on_note_posted() from public, anon, authenticated;

-- ===========================================================================
