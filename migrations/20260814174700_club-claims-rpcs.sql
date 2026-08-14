-- 12. CLAIMS, OWNERSHIP, AND SCHOOL-ADMIN CONTROLS
-- ===========================================================================
create or replace function public.claim_club(
  p_club_id uuid, p_position text default 'President', p_message text default null
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not exists (select 1 from public.clubs where id = p_club_id and status = 'approved') then
    raise exception 'club not found';
  end if;
  insert into public.club_claims (club_id, user_id, position, message)
  values (p_club_id, auth.uid(), coalesce(nullif(trim(p_position), ''), 'President'),
          nullif(trim(p_message), ''));
  insert into public.audit_logs (actor, action, entity, entity_id)
    values (auth.uid(), 'claim_club', 'club', p_club_id);
end;
$$;

create or replace function public.review_club_claim(
  p_claim_id uuid, p_approve boolean, p_reason text default null
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_club uuid; v_user uuid; v_position text; v_name text;
begin
  if not public.is_special_admin() then
    raise exception 'only the school admin may review club claims';
  end if;
  select club_id, user_id, position into v_club, v_user, v_position
    from public.club_claims where id = p_claim_id and status = 'pending';
  if v_club is null then
    raise exception 'claim not found';
  end if;
  select name into v_name from public.clubs where id = v_club;

  update public.club_claims
     set status = case when p_approve then 'approved' else 'rejected' end,
         rejection_reason = case when p_approve then null else p_reason end,
         reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_claim_id;

  if p_approve then
    update public.clubs set president_id = v_user where id = v_club;
    update public.profiles
       set role = 'verified_president', president_status = 'approved',
           president_reviewed_at = now(), president_reviewed_by = auth.uid()
     where id = v_user and role in ('student', 'club_admin', 'verified_president');
    insert into public.club_members (club_id, user_id, role, status, board_status, position, permissions)
    values (v_club, v_user, 'president', 'active', 'approved', coalesce(v_position, 'President'),
            public.club_permission_keys())
    on conflict (club_id, user_id) do update
      set role = 'president', status = 'active', board_status = 'approved',
          position = coalesce(v_position, 'President'),
          permissions = public.club_permission_keys();
    insert into public.notifications (user_id, club_id, type, title, body, entity_id)
    values (v_user, v_club, 'club_approved',
            'You now manage ' || coalesce(v_name, 'your club'), null, v_club);
  else
    insert into public.notifications (user_id, club_id, type, title, body, entity_id)
    values (v_user, v_club, 'club_rejected', 'Club claim declined', p_reason, v_club);
  end if;

  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), case when p_approve then 'approve_club_claim' else 'reject_club_claim' end,
            'club', v_club, jsonb_build_object('claim', p_claim_id, 'user', v_user));
end;
$$;

create or replace function public.list_club_claims()
returns table (
  id uuid, club_id uuid, club_name text, user_id uuid, email text,
  display_name text, member_position text, message text, created_at timestamptz
)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select cc.id, cc.club_id, c.name, cc.user_id, p.email, p.display_name,
         cc.position, cc.message, cc.created_at
    from public.club_claims cc
    join public.clubs c on c.id = cc.club_id
    join public.profiles p on p.id = cc.user_id
   where cc.status = 'pending' and public.is_special_admin()
   order by cc.created_at
$$;

create or replace function public.transfer_club_ownership(p_club_id uuid, p_email text)
returns text language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_user uuid; v_old uuid;
begin
  if not public.is_special_admin() then
    raise exception 'only the school admin may transfer club ownership';
  end if;
  select id into v_user from public.profiles where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No @lwsd.org account found for % (they must sign up first)', p_email;
  end if;
  select president_id into v_old from public.clubs where id = p_club_id;

  update public.clubs set president_id = v_user where id = p_club_id;
  update public.profiles
     set role = 'verified_president', president_status = 'approved',
         president_reviewed_at = now(), president_reviewed_by = auth.uid()
   where id = v_user and role in ('student', 'club_admin', 'verified_president');

  if v_old is not null and v_old <> v_user then
    update public.club_members set role = 'board', position = 'Past President',
           permissions = '{}', board_status = 'approved'
     where club_id = p_club_id and user_id = v_old;
  end if;

  insert into public.club_members (club_id, user_id, role, status, board_status, position, permissions)
  values (p_club_id, v_user, 'president', 'active', 'approved', 'President', public.club_permission_keys())
  on conflict (club_id, user_id) do update
    set role = 'president', status = 'active', board_status = 'approved',
        position = 'President', permissions = public.club_permission_keys();

  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'transfer_club_ownership', 'club', p_club_id,
            jsonb_build_object('to', v_user, 'from', v_old));
  return 'ownership transferred to ' || lower(p_email);
end;
$$;

-- Archive (or restore) a club. Archived clubs drop out of the directory but
-- their history is kept for the audit trail.
create or replace function public.set_club_active(p_club_id uuid, p_active boolean)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  if not public.is_special_admin() then
    raise exception 'only the school admin may archive clubs';
  end if;
  update public.clubs set is_active = p_active where id = p_club_id;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
    values (auth.uid(), 'set_club_active', 'club', p_club_id, jsonb_build_object('active', p_active));
end;
$$;

-- ===========================================================================
