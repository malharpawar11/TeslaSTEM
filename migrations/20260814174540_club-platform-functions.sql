-- 7. AUTHORIZATION HELPERS
--    SECURITY DEFINER so RLS on the tables they read can never hide the row
--    that decides the answer.
-- ===========================================================================

-- Full administrative control of a club: the school admin, an assigned club
-- admin, the club's verified president, or an active president membership.
create or replace function public.can_admin_club(c uuid) returns boolean
  language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select public.is_special_admin()
      or exists (select 1 from public.club_admins where club_id = c and user_id = auth.uid())
      or exists (
           select 1 from public.clubs cl
           join public.profiles p on p.id = auth.uid()
           where cl.id = c and cl.president_id = auth.uid() and p.role = 'verified_president'
         )
      or exists (
           select 1 from public.club_members m
           where m.club_id = c and m.user_id = auth.uid()
             and m.role = 'president' and m.status = 'active'
         )
$$;

-- A single management capability. Presidents/admins hold every permission;
-- board members hold exactly the ones the president granted them.
create or replace function public.has_club_permission(c uuid, perm text) returns boolean
  language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select public.can_admin_club(c)
      or exists (
           select 1 from public.club_members m
           where m.club_id = c and m.user_id = auth.uid()
             and m.status = 'active' and m.role = 'board'
             and m.board_status = 'approved'
             and perm = any (m.permissions)
         )
$$;

-- Membership: gates the club's member-only area (files, notes, roster).
create or replace function public.is_club_member(c uuid) returns boolean
  language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select public.can_admin_club(c)
      or exists (
           select 1 from public.club_members m
           where m.club_id = c and m.user_id = auth.uid() and m.status = 'active'
         )
$$;

grant execute on function public.club_permission_keys() to authenticated;
grant execute on function public.has_club_permission(uuid, text) to authenticated;
grant execute on function public.is_club_member(uuid) to authenticated;

-- ===========================================================================
-- 8. DERIVED STATE: member counts and updated_at
-- ===========================================================================
create or replace function public.touch_updated_at() returns trigger
  language plpgsql set search_path = pg_catalog, public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger club_events_touch before update on public.club_events
  for each row execute procedure public.touch_updated_at();
create trigger club_notes_touch before update on public.club_notes
  for each row execute procedure public.touch_updated_at();
create trigger announcements_touch before update on public.announcements
  for each row execute procedure public.touch_updated_at();
create trigger clubs_touch before update on public.clubs
  for each row execute procedure public.touch_updated_at();

create or replace function public.sync_club_member_count() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_club uuid;
begin
  v_club := coalesce(new.club_id, old.club_id);
  update public.clubs c
     set member_count = (
       select count(*) from public.club_members m
       where m.club_id = v_club and m.status = 'active'
     )
   where c.id = v_club;
  return null;
end;
$$;

create trigger club_members_count after insert or update or delete on public.club_members
  for each row execute procedure public.sync_club_member_count();

-- ===========================================================================
-- 9. NOTIFICATION FAN-OUT
-- ===========================================================================

-- Resolves a user's preference for one notification kind: the club override
-- wins, then the user's global row, then "on".
create or replace function public.wants_notification(p_user uuid, p_club uuid, p_kind text)
returns boolean language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_club_pref boolean; v_global_pref boolean;
begin
  select case p_kind
           when 'announcements' then announcements
           when 'events' then events
           when 'files' then files
           when 'notes' then notes
           when 'reminders' then reminders
         end
    into v_club_pref
    from public.notification_preferences
   where user_id = p_user and club_id = p_club;
  if v_club_pref is not null then
    return v_club_pref;
  end if;

  select case p_kind
           when 'announcements' then announcements
           when 'events' then events
           when 'files' then files
           when 'notes' then notes
           when 'reminders' then reminders
         end
    into v_global_pref
    from public.notification_preferences
   where user_id = p_user and club_id is null;
  return coalesce(v_global_pref, true);
end;
$$;

-- Fans a club event out to every active member except the actor, honouring
-- each member's preferences.
create or replace function public.notify_club_members(
  p_club uuid, p_type text, p_kind text, p_title text, p_body text, p_entity uuid
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  insert into public.notifications (user_id, club_id, type, title, body, entity_id)
  select m.user_id, p_club, p_type, p_title, p_body, p_entity
    from public.club_members m
   where m.club_id = p_club
     and m.status = 'active'
     and m.user_id is distinct from auth.uid()
     and public.wants_notification(m.user_id, p_club, p_kind);
end;
$$;

-- Notifies the people who can act on a request (president + board members
-- holding the relevant permission).
create or replace function public.notify_club_managers(
  p_club uuid, p_type text, p_perm text, p_title text, p_body text, p_entity uuid
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  insert into public.notifications (user_id, club_id, type, title, body, entity_id)
  select distinct u.user_id, p_club, p_type, p_title, p_body, p_entity
    from (
      select m.user_id from public.club_members m
       where m.club_id = p_club and m.status = 'active'
         and (m.role = 'president' or (m.role = 'board' and m.board_status = 'approved'
                                       and p_perm = any (m.permissions)))
      union
      select ca.user_id from public.club_admins ca where ca.club_id = p_club
      union
      select cl.president_id from public.clubs cl where cl.id = p_club and cl.president_id is not null
    ) u
   where u.user_id is distinct from auth.uid();
end;
$$;

create or replace function public.on_announcement_created() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_club_name text;
begin
  if new.club_id is null then
    -- School-wide announcement: everyone with an account hears it.
    insert into public.notifications (user_id, club_id, type, title, body, entity_id)
    select p.id, null, 'school_announcement', new.title, left(new.body, 200), new.id
      from public.profiles p
     where p.id is distinct from auth.uid();
    return new;
  end if;
  select name into v_club_name from public.clubs where id = new.club_id;
  perform public.notify_club_members(
    new.club_id, 'announcement', 'announcements',
    coalesce(v_club_name, 'Your club') || ': ' || new.title,
    left(new.body, 200), new.id
  );
  return new;
end;
$$;

create trigger announcements_notify after insert on public.announcements
  for each row execute procedure public.on_announcement_created();

create or replace function public.on_event_written() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_club_name text; v_type text; v_title text;
begin
  select name into v_club_name from public.clubs where id = new.club_id;
  if tg_op = 'INSERT' then
    v_type := 'event_created';
    v_title := coalesce(v_club_name, 'Your club') || ': ' || new.title;
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    v_type := 'event_cancelled';
    v_title := 'Cancelled: ' || new.title;
  elsif new.starts_at is distinct from old.starts_at
        or new.location is distinct from old.location
        or new.title is distinct from old.title then
    v_type := 'event_updated';
    v_title := 'Updated: ' || new.title;
  else
    return new;
  end if;
  perform public.notify_club_members(
    new.club_id, v_type, 'events', v_title,
    to_char(new.starts_at at time zone 'America/Los_Angeles', 'Mon DD, YYYY at HH12:MI AM')
      || coalesce(' · ' || new.location, ''),
    new.id
  );
  return new;
end;
$$;

create trigger club_events_notify after insert or update on public.club_events
  for each row execute procedure public.on_event_written();

create or replace function public.on_file_uploaded() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_club_name text;
begin
  select name into v_club_name from public.clubs where id = new.club_id;
  perform public.notify_club_members(
    new.club_id, 'file_uploaded', 'files',
    coalesce(v_club_name, 'Your club') || ' shared a file',
    new.title, new.id
  );
  return new;
end;
$$;

create trigger club_files_notify after insert on public.club_files
  for each row execute procedure public.on_file_uploaded();

create or replace function public.on_note_posted() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_club_name text;
begin
  select name into v_club_name from public.clubs where id = new.club_id;
  perform public.notify_club_members(
    new.club_id, 'note_posted', 'notes',
    coalesce(v_club_name, 'Your club') || ' posted notes',
    new.title, new.id
  );
  return new;
end;
$$;

create trigger club_notes_notify after insert on public.club_notes
  for each row execute procedure public.on_note_posted();

-- ===========================================================================
