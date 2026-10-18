create function public.read_visible_direct_messages(p_peer uuid,p_ids uuid[]) returns void language sql security definer set search_path=pg_catalog,public,pg_temp as $$
 update public.direct_messages set read_at=now() where recipient_id=auth.uid() and sender_id=p_peer and id=any(p_ids) and cardinality(p_ids)<=50 and read_at is null and public.messaging_account(auth.uid())
$$;
revoke all on function public.read_visible_direct_messages(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.read_visible_direct_messages(uuid,uuid[]) to authenticated;
