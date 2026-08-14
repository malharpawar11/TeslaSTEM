-- Club platform, part 6: join-request review and permission editing.

create or replace function public.review_join_request(
  p_club_id uuid, p_user_id uuid, p_approve boolean, p_reason text default null
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_name text;
begin
  if not public.has_club_permission(p_club_id, 'members') then
    raise exception 'you do not have permission to manage members for this club';
  end if;
  select name into v_name from public.clubs where id = p_club_id;

  if p_approve then
    update public.club_members
       set status = 'active', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null
     where club_id = p_club_id and user_id = p_user_id and status = 'pending';
    insert into public.notifications (user_id, club_id, type, title, body, entity_id)
    values (p_user_id, p_club_id, 'membership_approved',
            'You joined ' || coalesce(v_name, 'a club'), null, p_club_id);
  else
    update public.club_members
       set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = p_reason
     where club_id = p_club_id and user_id = p_user_id and status = 'pending';
  end if;

  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), case when p_approve then 'approve_member' else 'reject_member' end,
            'club', p_club_id, jsonb_build_object('user', p_user_id));
end;
$$;

-- Adjust an existing board member's position or permissions.
create or replace function public.set_member_permissions(
  p_club_id uuid, p_user_id uuid, p_position text, p_permissions text[]
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_perms text[];
begin
  if not public.has_club_permission(p_club_id, 'board') then
    raise exception 'you do not have permission to manage board members for this club';
  end if;
  v_perms := coalesce(p_permissions, '{}');
  if not (v_perms <@ public.club_permission_keys()) then
    raise exception 'unknown permission requested';
  end if;
  update public.club_members
     set position = nullif(trim(p_position), ''), permissions = v_perms,
         reviewed_at = now(), reviewed_by = auth.uid()
   where club_id = p_club_id and user_id = p_user_id and role = 'board';
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'set_member_permissions', 'club', p_club_id,
            jsonb_build_object('user', p_user_id, 'permissions', v_perms));
end;
$$;

-- Remove someone from a club. A president can only be removed by the school
-- admin, so a board member cannot demote their own president.
