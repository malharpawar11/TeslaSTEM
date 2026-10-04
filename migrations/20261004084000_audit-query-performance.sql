-- Index referencing columns for joins/account deletion and cache caller identity
-- inside RLS predicates. This preserves policy decisions and avoids per-row work.
-- Storage RLS invokes this harmless key parser as the runtime caller. Revoking
-- its execution from authenticated broke otherwise-authorized file uploads.
grant execute on function public.club_id_from_key(text) to authenticated;
create index if not exists announcements_updated_by_idx on public.announcements(updated_by);
create index if not exists announcements_created_by_idx on public.announcements(created_by);
create index if not exists club_claims_user_idx on public.club_claims(user_id);
create index if not exists club_claims_reviewer_idx on public.club_claims(reviewed_by);
create index if not exists club_events_creator_idx on public.club_events(created_by);
create index if not exists club_events_updater_idx on public.club_events(updated_by);
create index if not exists club_files_uploader_idx on public.club_files(uploaded_by);
create index if not exists club_notes_creator_idx on public.club_notes(created_by);
create index if not exists club_notes_updater_idx on public.club_notes(updated_by);
create index if not exists notifications_club_idx on public.notifications(club_id);
create index if not exists club_admins_user_idx on public.club_admins(user_id);
create index if not exists club_members_reviewer_idx on public.club_members(reviewed_by);
create index if not exists clubs_reviewer_idx on public.clubs(reviewed_by);
create index if not exists clubs_creator_idx on public.clubs(created_by);
create index if not exists clubs_president_idx on public.clubs(president_id);
create index if not exists clubs_status_idx on public.clubs(status);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor);
create index if not exists notification_preferences_club_idx on public.notification_preferences(club_id);
create index if not exists profiles_president_reviewer_idx on public.profiles(president_reviewed_by);
create index if not exists club_messages_club_idx on public.club_messages(club_id);

do $$
declare p record; q text; c text; statement text;
begin
  for p in select * from pg_policies where schemaname='public' loop
    q := p.qual;
    c := p.with_check;
    -- Already cached predicates are retained. Policies containing caller checks
    -- without initplans gain a scalar subquery, which is constant per statement.
    if q is not null and q not like '%SELECT auth.uid()%' then
      q := replace(q,'auth.uid()','(select auth.uid())');
    end if;
    if c is not null and c not like '%SELECT auth.uid()%' then
      c := replace(c,'auth.uid()','(select auth.uid())');
    end if;
    if q is distinct from p.qual or c is distinct from p.with_check then
      statement := format('alter policy %I on public.%I',p.policyname,p.tablename);
      if q is not null then statement := statement || ' using (' || q || ')'; end if;
      if c is not null then statement := statement || ' with check (' || c || ')'; end if;
      execute statement;
    end if;
  end loop;
end $$;
