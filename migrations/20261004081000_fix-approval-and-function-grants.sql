-- Fix verified club ownership, approval-policy bypass, and broad PUBLIC grants.
create or replace function public.approve_club(p_club_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_owner uuid; v_status public.approval_status;
begin
  if not public.is_special_admin() then raise exception 'only the special_admin may approve clubs'; end if;
  select created_by,status into v_owner,v_status from public.clubs where id=p_club_id for update;
  if v_owner is null then raise exception 'club not found or submitter no longer exists'; end if;
  if v_status <> 'pending' then raise exception 'club has already been reviewed'; end if;
  update public.clubs set status='approved', president_id=v_owner, rejection_reason=null,reviewed_at=now(),reviewed_by=auth.uid() where id=p_club_id;
  update public.profiles set president_status='approved',role='verified_president',president_reviewed_at=now(),president_reviewed_by=auth.uid()
    where id=v_owner and role<>'special_admin';
  insert into public.club_members(club_id,user_id,role,status,board_status,position,permissions)
    values(p_club_id,v_owner,'president','active','approved','President',public.club_permission_keys())
    on conflict(club_id,user_id) do update set role='president',status='active',board_status='approved',position='President',permissions=public.club_permission_keys();
  insert into public.notifications(user_id,club_id,type,title,body,entity_id)
    values(v_owner,p_club_id,'club_approved','Your club was approved','You can now manage your club as its president.',p_club_id);
  insert into public.audit_logs(actor,action,entity,entity_id) values(auth.uid(),'approve_club','club',p_club_id);
end $$;

create or replace function public.leave_club(p_club_id uuid) returns void
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists(select 1 from public.club_members where club_id=p_club_id and user_id=auth.uid() and role='president')
    or exists(select 1 from public.clubs where id=p_club_id and president_id=auth.uid())
    then raise exception 'Ask the school admin to transfer club ownership before leaving'; end if;
  delete from public.club_members where club_id=p_club_id and user_id=auth.uid();
  delete from public.notification_preferences where club_id=p_club_id and user_id=auth.uid();
  insert into public.audit_logs(actor,action,entity,entity_id) values(auth.uid(),'leave_club','club',p_club_id);
end $$;

create or replace function public.request_board_role(p_club_id uuid,p_position text,p_message text default null)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_name text; v_policy text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select name,join_policy into v_name,v_policy from public.clubs where id=p_club_id and status='approved' and is_active;
  if v_name is null then raise exception 'club not found'; end if;
  if exists(select 1 from public.club_members where club_id=p_club_id and user_id=auth.uid() and status='active' and role in ('board','president'))
    then raise exception 'You already hold a leadership role'; end if;
  insert into public.club_members(club_id,user_id,role,status,board_status,position,board_message,board_requested_at)
    values(p_club_id,auth.uid(),'member',case when v_policy='approval' then 'pending'::public.membership_status else 'active'::public.membership_status end,
      'pending',nullif(btrim(p_position),''),nullif(btrim(p_message),''),now())
    on conflict(club_id,user_id) do update set board_status='pending',position=nullif(btrim(p_position),''),
      board_message=nullif(btrim(p_message),''),board_requested_at=now(),rejection_reason=null;
  perform public.notify_club_managers(p_club_id,'board_request','board','New board member request',
    coalesce(nullif(btrim(p_position),''),'Someone') || ' requested board access for ' || v_name,auth.uid());
  insert into public.audit_logs(actor,action,entity,entity_id,metadata)
    values(auth.uid(),'request_board_role','club',p_club_id,jsonb_build_object('position',p_position));
end $$;

-- Functions retain their explicit authenticated grants. Anonymous callers only
-- need the safe public reads and authorization helpers invoked by public RLS.
revoke execute on function public.approve_club(uuid),public.assign_club_admin(uuid,text),
  public.claim_club(uuid,text,text),public.dashboard_feed(integer),public.join_club(uuid),public.leave_club(uuid),
  public.list_club_admins(uuid),public.list_club_claims(),public.list_club_members(uuid),public.log_audit(text,text,uuid,jsonb),
  public.mark_notifications_read(bigint[]),public.my_club_access(uuid),public.register_push_token(text,text),
  public.reject_club(uuid,text),public.reject_president(uuid,text),public.remove_club_admin(uuid,uuid),public.remove_club_member(uuid,uuid),
  public.request_board_role(uuid,text,text),public.request_president_verification(),public.review_board_request(uuid,uuid,boolean,text,text[],text),
  public.review_club_claim(uuid,boolean,text),public.review_join_request(uuid,uuid,boolean,text),
  public.set_club_active(uuid,boolean),public.set_member_permissions(uuid,uuid,text,text[]),
  public.set_notification_preferences(uuid,boolean,boolean,boolean,boolean,boolean),public.transfer_club_ownership(uuid,text),public.verify_president(uuid)
  from public,anon;
revoke execute on function public.enforce_lwsd_email(),public.handle_new_user(),public.lock_club_privileged_fields(),public.lock_profile_role()
  from public,anon,authenticated;
revoke execute on function public.my_app_role(),public.is_special_admin(),public.can_admin_club(uuid),public.has_club_permission(uuid,text),
  public.is_club_member(uuid),public.search_platform(text,integer) from public;
grant execute on function public.my_app_role(),public.is_special_admin(),public.can_admin_club(uuid),public.has_club_permission(uuid,text),
  public.is_club_member(uuid) to anon,authenticated;

-- Repair clubs approved under the old flow only when ownership is still unset.
update public.clubs c set president_id=c.created_by
  where c.status='approved' and c.president_id is null and c.created_by is not null
    and exists(select 1 from public.profiles p where p.id=c.created_by and p.president_status='approved');
insert into public.club_members(club_id,user_id,role,status,board_status,position,permissions)
  select c.id,c.president_id,'president','active','approved','President',public.club_permission_keys()
  from public.clubs c where c.status='approved' and c.president_id is not null
  on conflict(club_id,user_id) do nothing;
