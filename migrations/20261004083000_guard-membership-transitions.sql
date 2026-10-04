-- Prevent stale role restoration and demotion of presidents through board review.
-- 11. MEMBERSHIP RPCs
-- ===========================================================================

-- Join a club. Returns 'active' or 'pending' depending on the club's policy.
create or replace function public.join_club(p_club_id uuid) returns text
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_policy text; v_name text; v_status public.membership_status; v_existing public.membership_status;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  select join_policy, name into v_policy, v_name
    from public.clubs where id = p_club_id and status = 'approved' and is_active;
  if v_policy is null then
    raise exception 'club not found or not open for joining';
  end if;

  select status into v_existing from public.club_members
   where club_id = p_club_id and user_id = auth.uid();
  if v_existing = 'active' then
    return 'active';
  end if;

  v_status := case when v_policy = 'approval' then 'pending' else 'active' end;

  insert into public.club_members (club_id, user_id, role, status)
  values (p_club_id, auth.uid(), 'member', v_status)
  on conflict (club_id, user_id) do update
    set status = v_status, role='member', permissions='{}', board_status=null, position=null, rejection_reason = null, joined_at = now();

  if v_status = 'pending' then
    perform public.notify_club_managers(
      p_club_id, 'join_request', 'members', 'New join request',
      'A student asked to join ' || coalesce(v_name, 'your club') || '.', auth.uid()
    );
  end if;

  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'join_club', 'club', p_club_id, jsonb_build_object('status', v_status));
  return v_status::text;
end;
$$;


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
  if not exists (select 1 from public.club_members where club_id=p_club_id and user_id=p_user_id and board_status='pending' and role<>'president') then
    raise exception 'Only a pending board request can be reviewed';
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
