-- Let the caller's RLS enforce ownership on quiz preferences and club reviews.
-- Validation applies equally to direct table writes and RPC writes.
create function public.validate_discovery_preferences() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
declare w jsonb;
begin
  if new.interests is null or new.careers is null or new.availability is null or new.completed is null
    or not (new.interests <@ array['STEM','Arts','Service','Sports','Culture','Academic','Business','Wellness']::text[])
    or not (new.careers <@ array['Engineering','Computer science','Medicine','Business','Arts and design','Research','Public service']::text[])
    or jsonb_typeof(new.availability) <> 'array' or jsonb_array_length(new.availability) > 28
    then raise exception 'Invalid preferences'; end if;
  for w in select value from jsonb_array_elements(new.availability) loop
    if w->>'day' is null or not ((w->>'day') = any(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']))
      then raise exception 'Invalid weekday'; end if;
    if w->>'period' is not null then
      if not ((w->>'period') = any(array['At Lunch','After School','Before School']))
        then raise exception 'Invalid school period'; end if;
    elsif w->>'start' is null or w->>'end' is null
      or w->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or w->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or w->>'end' <= w->>'start' then raise exception 'Invalid availability window'; end if;
  end loop;
  return new;
end $$;
revoke execute on function public.validate_discovery_preferences() from public, anon, authenticated;
create trigger validate_discovery_preferences before insert or update on public.student_preferences
  for each row execute function public.validate_discovery_preferences();

create policy "create own discovery preferences" on public.student_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "edit own discovery preferences" on public.student_preferences
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant insert (user_id, interests, careers, availability, completed),
      update (interests, careers, availability, completed)
  on public.student_preferences to authenticated;

create or replace function public.save_student_preferences(
  p_interests text[], p_careers text[], p_availability jsonb, p_completed boolean
) returns void language sql security invoker set search_path = pg_catalog as $$
  insert into public.student_preferences(user_id, interests, careers, availability, completed)
  values(auth.uid(), p_interests, p_careers, p_availability, p_completed)
  on conflict(user_id) do update set interests=excluded.interests, careers=excluded.careers,
    availability=excluded.availability, completed=excluded.completed
$$;

create policy "active members create own reviews" on public.club_reviews
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.club_members m
      where m.club_id = club_reviews.club_id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  );
create policy "active members update own reviews" on public.club_reviews
  for update to authenticated
  using (
    user_id = (select auth.uid()) and exists (
      select 1 from public.club_members m
      where m.club_id = club_reviews.club_id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  ) with check (user_id = (select auth.uid()));
grant insert (club_id, user_id, rating, body), update (rating, body)
  on public.club_reviews to authenticated;
create function public.touch_club_review() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.touch_club_review() from public, anon, authenticated;
create trigger touch_club_review before update on public.club_reviews
  for each row execute function public.touch_club_review();
create or replace function public.save_club_review(p_club_id uuid, p_rating integer, p_body text)
returns void language sql security invoker set search_path = pg_catalog as $$
  insert into public.club_reviews(club_id,user_id,rating,body)
  values(p_club_id,auth.uid(),p_rating,btrim(p_body))
  on conflict(club_id,user_id) do update set rating=excluded.rating,body=excluded.body
$$;

revoke execute on function public.save_student_preferences(text[],text[],jsonb,boolean),
  public.save_club_review(uuid,integer,text) from public, anon;
grant execute on function public.save_student_preferences(text[],text[],jsonb,boolean),
  public.save_club_review(uuid,integer,text) to authenticated;
