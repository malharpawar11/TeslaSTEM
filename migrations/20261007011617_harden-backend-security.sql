-- Narrow direct writes independently of RLS. Approval/ownership RPCs still
-- execute as the owner and retain their explicit authorization checks.
revoke insert, update, delete on public.clubs from anon, authenticated;
grant insert (name,category,description,meeting_day,meeting_time,location,advisor,
  contact_email,join_policy,status,created_by) on public.clubs to authenticated;
grant update (name,category,description,meeting_day,meeting_time,location,advisor,
  contact_email,instagram,website,join_policy,career_tags,logo_url,logo_key,
  banner_url,banner_key) on public.clubs to authenticated;
revoke insert,update,delete on public.announcements,public.club_events,
  public.club_files,public.club_notes,public.notification_preferences,public.push_tokens from anon;

-- Audit events come from database writes rather than arbitrary client claims.
revoke execute on function public.log_audit(text,text,uuid,jsonb) from public,anon,authenticated;
create or replace function public.audit_announcement_insert() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  insert into public.audit_logs(actor,action,entity,entity_id,metadata)
  values(auth.uid(),'create_announcement','announcement',new.id,
    jsonb_build_object('club_id',new.club_id,'title',new.title));
  return new;
end $$;
revoke all on function public.audit_announcement_insert() from public,anon,authenticated;
create trigger announcement_insert_audit after insert on public.announcements
  for each row execute function public.audit_announcement_insert();

-- RLS controls row access, but cannot compare old/new attribution or club IDs.
create or replace function public.guard_content_identity() returns trigger
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare actor_column text;
begin
  if current_user='project_admin' then return new; end if;
  actor_column := case when tg_table_name='club_files' then 'uploaded_by' else 'created_by' end;
  if tg_op='UPDATE' then
    if new.id is distinct from old.id or new.club_id is distinct from old.club_id
      or new.created_at is distinct from old.created_at
      or (to_jsonb(new)->actor_column) is distinct from (to_jsonb(old)->actor_column)
    then raise exception 'Content identity, club, and original attribution are immutable'; end if;
  end if;
  -- Both created_by and uploaded_by are independently checked by INSERT RLS.
  if tg_table_name<>'club_files' then new.updated_by:=auth.uid(); end if;
  return new;
end $$;
revoke all on function public.guard_content_identity() from public,anon,authenticated;
create trigger guard_announcement_identity before insert or update on public.announcements
  for each row execute function public.guard_content_identity();
create trigger guard_event_identity before insert or update on public.club_events
  for each row execute function public.guard_content_identity();
create trigger guard_file_identity before insert or update on public.club_files
  for each row execute function public.guard_content_identity();
create trigger guard_note_identity before insert or update on public.club_notes
  for each row execute function public.guard_content_identity();

-- NULL formerly removed LIMIT altogether; huge values could exhaust resources.
do $$
declare f record; definition text;
begin
  for f in select oid from pg_proc where oid in
    ('public.search_platform(text,integer)'::regprocedure,'public.dashboard_feed(integer)'::regprocedure)
  loop
    definition:=pg_get_functiondef(f.oid);
    definition:=replace(definition,'limit p_limit','limit greatest(1,least(coalesce(p_limit,8),50))');
    execute definition;
  end loop;
end $$;
