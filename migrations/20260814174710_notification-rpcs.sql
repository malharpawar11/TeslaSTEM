-- 13. NOTIFICATION RPCs
-- ===========================================================================
create or replace function public.set_notification_preferences(
  p_club_id uuid,
  p_announcements boolean,
  p_events boolean,
  p_files boolean,
  p_notes boolean,
  p_reminders boolean
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_rows integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  update public.notification_preferences
     set announcements = p_announcements, events = p_events, files = p_files,
         notes = p_notes, reminders = p_reminders, updated_at = now()
   where user_id = auth.uid() and club_id is not distinct from p_club_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    insert into public.notification_preferences
      (user_id, club_id, announcements, events, files, notes, reminders)
    values (auth.uid(), p_club_id, p_announcements, p_events, p_files, p_notes, p_reminders);
  end if;
end;
$$;

create or replace function public.register_push_token(p_token text, p_platform text default null)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set user_id = auth.uid(), platform = p_platform, updated_at = now();
end;
$$;

create or replace function public.mark_notifications_read(p_ids bigint[] default null)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or id = any (p_ids));
end;
$$;

-- ===========================================================================
