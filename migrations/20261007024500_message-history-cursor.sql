-- A timestamp alone skips messages sharing the same creation time at a page boundary.
create function public.message_history_page(p_club_id uuid,p_peer uuid,p_before timestamptz default null,p_before_id uuid default null)
returns setof public.club_messages language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
  select m.* from public.club_messages m where m.club_id=p_club_id
    and ((m.sender_id=auth.uid() and m.recipient_id=p_peer) or (m.recipient_id=auth.uid() and m.sender_id=p_peer))
    and (p_before is null or m.created_at<p_before or (m.created_at=p_before and p_before_id is not null and m.id<p_before_id))
    order by m.created_at desc,m.id desc limit 50
$$;
revoke all on function public.message_history_page(uuid,uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.message_history_page(uuid,uuid,timestamptz,uuid) to authenticated;
