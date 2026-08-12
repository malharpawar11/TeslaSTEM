-- Applied to production 2026-07-07. Recovered from
-- supabase_migrations.schema_migrations.
--
-- Trigger functions must never be reachable via PostgREST (/rpc). They fire
-- as the table owner regardless of grants, so removing EXECUTE from API roles
-- is pure hardening with no behavioural change.
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.lock_profile_role()           from public, anon, authenticated;
revoke execute on function public.lock_club_privileged_fields() from public, anon, authenticated;

-- Privileged workflow RPCs: keep them callable by signed-in users (the role
-- check lives inside each), but there is no reason a signed-OUT (anon) caller
-- should reach them — they require auth.uid() and would only ever error.
-- Postgres grants EXECUTE to PUBLIC by default on creation, so revoke that and
-- re-assert the authenticated grant explicitly.
do $$
declare fn text;
begin
  foreach fn in array array[
    'request_president_verification()',
    'verify_president(uuid)',
    'reject_president(uuid, text)',
    'approve_club(uuid)',
    'reject_club(uuid, text)',
    'assign_club_admin(uuid, text)',
    'remove_club_admin(uuid, uuid)',
    'list_club_admins(uuid)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;
