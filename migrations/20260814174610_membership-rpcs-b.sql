-- Club platform, part 5: board-request review (position + permission grant).

create or replace function public.review_board_request(
  p_club_id uuid,
  p_user_id uuid,
  p_approve boolean,
  p_position text default null,
  p_permissions text[] default '{}',
  p_reason text default null
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_name text; v_perms text[];
begin
  if not public.has_club_permission(p_club_id, 'board') then
    raise exception 'you do not have permission to manage board members for this club';
  end if;
  select name into v_name from public.clubs where id = p_club_id;
  v_perms := coalesce(p_permissions, '{}');
  if not (v_perms <@ public.club_permission_keys()) then
    raise exception 'unknown permission requested';
  end if;

  if p_approve then
    update public.club_members
       set role = 'board', status = 'active', board_status = 'approved',
           position = coalesce(nullif(trim(p_position), ''), club_members.position, 'Officer'),
           permissions = v_perms,
           reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null
     where club_id = p_club_id and user_id = p_user_id;

    insert into public.notifications (user_id, club_id, type, title, body, entity_id)
    values (p_user_id, p_club_id, 'board_approved',
            'You are on the board of ' || coalesce(v_name, 'your club'),
            coalesce(nullif(trim(p_position), ''), 'Officer'), p_club_id);
  else
    update public.club_members
       set role = 'member', board_status = 'rejected', permissions = '{}',
           reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = p_reason
     where club_id = p_club_id and user_id = p_user_id;

    insert into public.notifications (user_id, club_id, type, title, body, entity_id)
    values (p_user_id, p_club_id, 'board_rejected',
            'Board request declined', p_reason, p_club_id);
  end if;

  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), case when p_approve then 'approve_board_member' else 'reject_board_member' end,
            'club', p_club_id,
            jsonb_build_object('user', p_user_id, 'position', p_position, 'permissions', v_perms));
end;
$$;

-- Approve or decline a pending join request (clubs with join_policy = approval).
