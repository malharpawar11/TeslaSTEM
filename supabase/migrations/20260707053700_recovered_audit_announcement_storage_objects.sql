-- Reconstructed from the live database (2026-08-09), not from git history.
--
-- These objects exist in production but appear in neither 001_initial_schema.sql
-- nor any migration recorded in supabase_migrations.schema_migrations — they came
-- from a migration that was applied by hand and never committed. Everything here
-- is idempotent, so applying it to production is a no-op and applying it to a
-- fresh branch reproduces the real schema.

-- Audit helper used by the app instead of a direct insert, so `actor` can never
-- be spoofed: it is taken from auth.uid(), not from the request body.
create or replace function public.log_audit(
  p_action    text,
  p_entity    text,
  p_entity_id uuid  default null,
  p_metadata  jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'log_audit requires an authenticated user';
  end if;
  insert into public.audit_logs (actor, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

drop policy if exists "admins delete own club announcements" on public.announcements;
create policy "admins delete own club announcements" on public.announcements
  for delete using (public.can_admin_club(club_id));

-- Uploads stay open to any signed-in school account, but only the uploader (or
-- the special_admin, via the bucket owner) may change or remove an object.
drop policy if exists "club asset owner update" on storage.objects;
create policy "club asset owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'club-assets' and owner = auth.uid())
  with check (bucket_id = 'club-assets' and owner = auth.uid());

drop policy if exists "club asset owner delete" on storage.objects;
create policy "club asset owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'club-assets' and owner = auth.uid());
