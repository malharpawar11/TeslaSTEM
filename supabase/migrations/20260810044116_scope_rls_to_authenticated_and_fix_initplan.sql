-- Every policy below was defined for the `public` grantee, which means the
-- `anon` role (the key shipped inside the mobile app) evaluated them on every
-- request. The directory is @lwsd.org-only, so anonymous access buys nothing
-- and only widens the attack surface: scope all of them to `authenticated`.
-- auth.uid() / helper calls are also wrapped in a scalar sub-select so Postgres
-- evaluates them once per statement instead of once per row (auth_rls_initplan).

-- profiles ------------------------------------------------------------------
drop policy if exists "read own profile or super" on public.profiles;
create policy "read own profile or super" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_special_admin()));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_special_admin()))
  with check (id = (select auth.uid()) or (select public.is_special_admin()));

-- clubs ---------------------------------------------------------------------
drop policy if exists "clubs read approved or own" on public.clubs;
create policy "clubs read approved or own" on public.clubs
  for select to authenticated
  using (
    status = 'approved'::approval_status
    or created_by = (select auth.uid())
    or (select public.can_admin_club(id))
  );

drop policy if exists "clubs submit pending" on public.clubs;
create policy "clubs submit pending" on public.clubs
  for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'pending'::approval_status);

drop policy if exists "club admins update own clubs" on public.clubs;
create policy "club admins update own clubs" on public.clubs
  for update to authenticated
  using ((select public.can_admin_club(id)))
  with check ((select public.can_admin_club(id)));

drop policy if exists "super approve clubs" on public.clubs;
create policy "super admin manages clubs" on public.clubs
  for all to authenticated
  using ((select public.is_special_admin()))
  with check ((select public.is_special_admin()));

-- club_admins ---------------------------------------------------------------
drop policy if exists "club admins visible to managers" on public.club_admins;
create policy "club admins visible to managers" on public.club_admins
  for select to authenticated
  using ((select public.can_admin_club(club_id)) or user_id = (select auth.uid()));

-- club_followers ------------------------------------------------------------
drop policy if exists "followers manage own follows" on public.club_followers;
create policy "followers manage own follows" on public.club_followers
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "admins see followers" on public.club_followers;
create policy "admins see followers" on public.club_followers
  for select to authenticated
  using ((select public.can_admin_club(club_id)));

-- announcements -------------------------------------------------------------
drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements
  for select to authenticated
  using (
    exists (select 1 from clubs c where c.id = club_id and c.status = 'approved'::approval_status)
    or (select public.can_admin_club(club_id))
  );

drop policy if exists "admins create club announcements" on public.announcements;
create policy "admins create club announcements" on public.announcements
  for insert to authenticated
  with check ((select public.can_admin_club(club_id)) and created_by = (select auth.uid()));

drop policy if exists "admins update own club announcements" on public.announcements;
create policy "admins update own club announcements" on public.announcements
  for update to authenticated
  using ((select public.can_admin_club(club_id)))
  with check ((select public.can_admin_club(club_id)));

drop policy if exists "admins delete own club announcements" on public.announcements;
create policy "admins delete own club announcements" on public.announcements
  for delete to authenticated
  using ((select public.can_admin_club(club_id)));

-- audit_logs ----------------------------------------------------------------
drop policy if exists "super audit read" on public.audit_logs;
create policy "super audit read" on public.audit_logs
  for select to authenticated
  using ((select public.is_special_admin()));

drop policy if exists "super audit insert" on public.audit_logs;
create policy "super audit insert" on public.audit_logs
  for insert to authenticated
  with check ((select public.is_special_admin()));

-- No policy references these helpers for `anon` any more, so the anonymous key
-- can no longer probe them over /rest/v1/rpc/*.
revoke execute on function public.is_special_admin()      from anon;
revoke execute on function public.is_super_admin()        from anon;
revoke execute on function public.my_app_role()           from anon;
revoke execute on function public.can_admin_club(uuid)    from anon;
revoke execute on function public.log_audit(text, text, uuid, jsonb) from anon;
