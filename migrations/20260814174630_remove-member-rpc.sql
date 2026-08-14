-- Club platform, part 7: removing a member (presidents are school-admin only).

create or replace function public.remove_club_member(p_club_id uuid, p_user_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_role public.club_member_role;
begin
  if not public.has_club_permission(p_club_id, 'members') then
    raise exception 'you do not have permission to manage members for this club';
  end if;
  select role into v_role from public.club_members
   where club_id = p_club_id and user_id = p_user_id;
  if v_role = 'president' and not public.is_special_admin() then
    raise exception 'only the school admin may remove a club president';
  end if;
  delete from public.club_members where club_id = p_club_id and user_id = p_user_id;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'remove_club_member', 'club', p_club_id, jsonb_build_object('user', p_user_id));
end;
$$;
