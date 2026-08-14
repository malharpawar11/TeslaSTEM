-- 10. ROW LEVEL SECURITY
-- ===========================================================================
alter table public.club_members enable row level security;
alter table public.club_events enable row level security;
alter table public.club_files enable row level security;
alter table public.club_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
alter table public.club_claims enable row level security;

-- Memberships are written only by the RPCs below, never by direct DML: the
-- role, permissions, and approval state are all privileged fields.
revoke insert, update, delete on public.club_members from anon, authenticated;
revoke insert, update, delete on public.notifications from anon, authenticated;
revoke insert, update, delete on public.club_claims from anon, authenticated;

grant select on public.club_members, public.club_events, public.club_files,
                public.club_notes, public.club_claims to anon, authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant insert, update, delete on public.club_events, public.club_files, public.club_notes
  to authenticated;

-- MEMBERSHIPS: members see their club's roster; everyone sees their own rows.
create policy "members read roster" on public.club_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_club_member(club_id));

-- EVENTS: public for approved clubs (they feed the school-wide calendar),
-- plus always visible to the club's managers.
create policy "events readable" on public.club_events
  for select to anon, authenticated
  using (
    exists (select 1 from public.clubs c where c.id = club_id and c.status = 'approved' and c.is_active)
    or public.can_admin_club(club_id)
  );

create policy "events written by permitted" on public.club_events
  for insert to authenticated
  with check (public.has_club_permission(club_id, 'events') and created_by = auth.uid());

create policy "events updated by permitted" on public.club_events
  for update to authenticated
  using (public.has_club_permission(club_id, 'events'))
  with check (public.has_club_permission(club_id, 'events'));

create policy "events deleted by permitted" on public.club_events
  for delete to authenticated
  using (public.has_club_permission(club_id, 'events'));

-- FILES and NOTES are member-only content.
create policy "files readable by members" on public.club_files
  for select to authenticated
  using (public.is_club_member(club_id));

create policy "files written by permitted" on public.club_files
  for insert to authenticated
  with check (public.has_club_permission(club_id, 'files') and uploaded_by = auth.uid());

create policy "files updated by permitted" on public.club_files
  for update to authenticated
  using (public.has_club_permission(club_id, 'files'))
  with check (public.has_club_permission(club_id, 'files'));

create policy "files deleted by permitted" on public.club_files
  for delete to authenticated
  using (public.has_club_permission(club_id, 'files'));

create policy "notes readable by members" on public.club_notes
  for select to authenticated
  using (public.is_club_member(club_id));

create policy "notes written by permitted" on public.club_notes
  for insert to authenticated
  with check (public.has_club_permission(club_id, 'notes') and created_by = auth.uid());

create policy "notes updated by permitted" on public.club_notes
  for update to authenticated
  using (public.has_club_permission(club_id, 'notes'))
  with check (public.has_club_permission(club_id, 'notes'));

create policy "notes deleted by permitted" on public.club_notes
  for delete to authenticated
  using (public.has_club_permission(club_id, 'notes'));

-- NOTIFICATIONS: strictly your own inbox. The only permitted write is marking
-- your own rows read, which the column lock below enforces.
create policy "own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "mark own notifications read" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.lock_notification_fields() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  new.user_id := old.user_id;
  new.club_id := old.club_id;
  new.type := old.type;
  new.title := old.title;
  new.body := old.body;
  new.entity_id := old.entity_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger notifications_lock before update on public.notifications
  for each row execute procedure public.lock_notification_fields();

create policy "own notification preferences" on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own push tokens" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- CLAIMS: your own claims, plus everything for the school admin.
create policy "claims readable" on public.club_claims
  for select to authenticated
  using (user_id = auth.uid() or public.is_special_admin());

-- ANNOUNCEMENTS: replace the admin-only write policies with permission-aware
-- ones, and allow the school admin to post school-wide (club_id null).
drop policy if exists "admins create club announcements" on public.announcements;
drop policy if exists "admins update own club announcements" on public.announcements;
drop policy if exists "admins delete own club announcements" on public.announcements;
drop policy if exists "announcements readable" on public.announcements;

create policy "announcements readable" on public.announcements
  for select to anon, authenticated
  using (
    club_id is null
    or exists (select 1 from public.clubs c where c.id = club_id and c.status = 'approved')
    or public.can_admin_club(club_id)
  );

create policy "announcements written by permitted" on public.announcements
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (club_id is not null and public.has_club_permission(club_id, 'announcements'))
      or (club_id is null and public.is_special_admin())
    )
  );

create policy "announcements updated by permitted" on public.announcements
  for update to authenticated
  using (
    (club_id is not null and public.has_club_permission(club_id, 'announcements'))
    or (club_id is null and public.is_special_admin())
  )
  with check (
    (club_id is not null and public.has_club_permission(club_id, 'announcements'))
    or (club_id is null and public.is_special_admin())
  );

create policy "announcements deleted by permitted" on public.announcements
  for delete to authenticated
  using (
    (club_id is not null and public.has_club_permission(club_id, 'announcements'))
    or (club_id is null and public.is_special_admin())
  );

-- CLUBS: settings edits stay with people holding the 'settings' permission
-- (the privileged-column trigger from the first migration still pins status,
-- ownership, and review fields to the school admin).
drop policy if exists "clubs update by admins" on public.clubs;
create policy "clubs update by permitted" on public.clubs
  for update to authenticated
  using (public.has_club_permission(id, 'settings'))
  with check (public.has_club_permission(id, 'settings'));

-- ===========================================================================
