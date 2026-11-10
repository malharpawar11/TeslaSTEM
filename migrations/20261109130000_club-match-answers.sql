-- The Club Match Quiz keeps each student's full answers (activities, topics,
-- follow-ups, goals, experience, lunch) so they can be edited later and so
-- recommendations can be rebuilt from them. Availability stays where it was.
alter table public.student_preferences
  add column answers jsonb not null default '{}'::jsonb
  check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 16384);

grant select (answers), insert (answers), update (answers)
  on public.student_preferences to authenticated;

-- The current site still calls save_student_preferences; this one also saves
-- the answers. Same row rules: a student only ever writes their own row.
create function public.save_quiz_preferences(
  p_interests text[],
  p_careers text[],
  p_availability jsonb,
  p_completed boolean,
  p_answers jsonb
)
returns void
language sql
set search_path to 'pg_catalog'
as $$
  insert into public.student_preferences(user_id, interests, careers, availability, completed, answers)
  values(auth.uid(), p_interests, p_careers, p_availability, p_completed, coalesce(p_answers, '{}'::jsonb))
  on conflict(user_id) do update set interests=excluded.interests, careers=excluded.careers,
    availability=excluded.availability, completed=excluded.completed, answers=excluded.answers
$$;

revoke all on function public.save_quiz_preferences(text[], text[], jsonb, boolean, jsonb) from public;
grant execute on function public.save_quiz_preferences(text[], text[], jsonb, boolean, jsonb) to authenticated;
