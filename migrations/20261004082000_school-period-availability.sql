-- Match existing school-period schedules without inventing bell times.
create or replace function public.save_student_preferences(p_interests text[], p_careers text[], p_availability jsonb, p_completed boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare w jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to save preferences'; end if;
  if p_interests is null or p_careers is null or p_availability is null or p_completed is null
    or not (p_interests <@ array['STEM','Arts','Service','Sports','Culture','Academic','Business','Wellness']::text[])
    or not (p_careers <@ array['Engineering','Computer science','Medicine','Business','Arts and design','Research','Public service']::text[])
    or jsonb_typeof(p_availability) <> 'array' or jsonb_array_length(p_availability) > 28
    then raise exception 'Invalid preferences'; end if;
  for w in select value from jsonb_array_elements(p_availability) loop
    if (w->>'day') is null or not ((w->>'day') = any(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']))
      then raise exception 'Invalid weekday'; end if;
    if w->>'period' is not null then
      if not ((w->>'period') = any(array['At Lunch','After School','Before School'])) then raise exception 'Invalid school period'; end if;
    elsif (w->>'start') is null or (w->>'end') is null
      or (w->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or (w->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or (w->>'end') <= (w->>'start') then raise exception 'Invalid availability window'; end if;
  end loop;
  insert into public.student_preferences(user_id, interests, careers, availability, completed)
    values(auth.uid(), p_interests, p_careers, p_availability, p_completed)
    on conflict(user_id) do update set interests=excluded.interests, careers=excluded.careers,
      availability=excluded.availability, completed=excluded.completed;
end $$;
