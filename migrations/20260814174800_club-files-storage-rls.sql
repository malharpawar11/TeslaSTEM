-- Storage policies for the club-files bucket.
--
-- Object keys are written as `clubs/<club_id>/<uuid>-<filename>`, so the club
-- that owns an object is recoverable from its key. Writes are therefore gated
-- on the same has_club_permission(club, 'files') check the club_files table
-- uses: an uploader cannot drop a file into another club's folder by editing
-- the key in the request.
--
-- Reads: the bucket is public-read (unguessable UUID keys, link-style
-- sharing) because React Native opens attachments by URL. The club_files rows
-- that point at these objects stay member-only, so files are not discoverable
-- without membership.

create or replace function public.club_id_from_key(p_key text) returns uuid
  language plpgsql immutable set search_path = pg_catalog, public, pg_temp as $$
declare v_id uuid;
begin
  if split_part(p_key, '/', 1) <> 'clubs' then
    return null;
  end if;
  begin
    v_id := split_part(p_key, '/', 2)::uuid;
  exception when others then
    return null;
  end;
  return v_id;
end;
$$;

revoke all on function public.club_id_from_key(text) from public, anon, authenticated;

create policy "club files public read" on storage.objects
  for select to authenticated, anon
  using (bucket = 'club-files');

create policy "club files insert by permitted" on storage.objects
  for insert to authenticated
  with check (
    bucket = 'club-files'
    and public.has_club_permission(public.club_id_from_key(key), 'files')
  );

create policy "club files update by permitted" on storage.objects
  for update to authenticated
  using (
    bucket = 'club-files'
    and public.has_club_permission(public.club_id_from_key(key), 'files')
  )
  with check (
    bucket = 'club-files'
    and public.has_club_permission(public.club_id_from_key(key), 'files')
  );

create policy "club files delete by permitted" on storage.objects
  for delete to authenticated
  using (
    bucket = 'club-files'
    and public.has_club_permission(public.club_id_from_key(key), 'files')
  );
