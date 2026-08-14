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
    set status = v_status, rejection_reason = null, joined_at = now();

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

create or replace function public.leave_club(p_club_id uuid) returns void
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  delete from public.club_members where club_id = p_club_id and user_id = auth.uid();
  delete from public.notification_preferences where club_id = p_club_id and user_id = auth.uid();
  insert into public.audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'leave_club', 'club', p_club_id);
end;
$$;

-- Ask the president for board access. Joining first is not required — the RPC
-- creates the membership if it is missing.
create or replace function public.request_board_role(
  p_club_id uuid, p_position text, p_message text default null
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_name text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  select name into v_name from public.clubs where id = p_club_id and status = 'approved';
  if v_name is null then
    raise exception 'club not found';
  end if;

  insert into public.club_members (club_id, user_id, role, status, board_status,
                                   position, board_message, board_requested_at)
  values (p_club_id, auth.uid(), 'member', 'active', 'pending',
          nullif(trim(p_position), ''), nullif(trim(p_message), ''), now())
  on conflict (club_id, user_id) do update
    set board_status = 'pending',
        position = coalesce(nullif(trim(p_position), ''), club_members.position),
        board_message = nullif(trim(p_message), ''),
        board_requested_at = now(),
        rejection_reason = null;

  perform public.notify_club_managers(
    p_club_id, 'board_request', 'board', 'New board member request',
    coalesce(nullif(trim(p_position), ''), 'Someone') || ' requested board access for ' || v_name,
    auth.uid()
  );

  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'request_board_role', 'club', p_club_id,
            jsonb_build_object('position', p_position));
end;
$$;

-- President (or a board member holding 'board') decides a board request and
-- assigns the position plus the exact permission set.
