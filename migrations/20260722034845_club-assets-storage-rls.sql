-- club-assets is a public-read bucket: anyone can view assets (club logos,
-- photos), but only the uploader can write/replace/delete their own objects.
create policy "club assets public read" on storage.objects
  for select to authenticated, anon
  using (bucket = 'club-assets');

create policy "club assets owner insert" on storage.objects
  for insert to authenticated
  with check (bucket = 'club-assets' and uploaded_by = (select auth.jwt() ->> 'sub'));

create policy "club assets owner update" on storage.objects
  for update to authenticated
  using (bucket = 'club-assets' and uploaded_by = (select auth.jwt() ->> 'sub'))
  with check (bucket = 'club-assets' and uploaded_by = (select auth.jwt() ->> 'sub'));

create policy "club assets owner delete" on storage.objects
  for delete to authenticated
  using (bucket = 'club-assets' and uploaded_by = (select auth.jwt() ->> 'sub'));

grant select on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;
grant usage on schema storage to anon, authenticated;
