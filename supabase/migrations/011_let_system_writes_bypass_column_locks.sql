-- The lock triggers exist to stop CLIENT writes from touching server-owned
-- columns. They were also firing for internal operations that have no auth.uid():
-- most importantly the ON DELETE SET NULL cascade that runs when a profile is
-- removed: Postgres set clubs.created_by to null, the trigger copied the old
-- value straight back, and the delete then failed with a foreign key violation.
-- Deleting any user who had submitted a club was therefore impossible, from the
-- app, an RPC, or the Supabase dashboard.
--
-- Requests through PostgREST always carry auth.uid(); only service_role and
-- direct/administrative connections do not, and those are already trusted (they
-- bypass RLS entirely), so returning early for them removes no protection.
create or replace function public.lock_club_privileged_fields()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_special_admin() then
    new.status           := old.status;
    new.created_by       := old.created_by;
    new.president_id     := old.president_id;
    new.rejection_reason := old.rejection_reason;
    new.reviewed_at      := old.reviewed_at;
    new.reviewed_by      := old.reviewed_by;
  end if;
  return new;
end;
$$;

create or replace function public.lock_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_special    boolean;
  v_privileged boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  v_special    := public.is_special_admin();
  v_privileged := coalesce(current_setting('app.privileged_profile_write', true), '') = 'on';

  if new.role is distinct from old.role then
    if current_setting('app.allow_special_admin', true) = 'on' then
      null;
    elsif not v_special then
      new.role := old.role;
    elsif new.role = 'special_admin' and old.role <> 'special_admin' then
      raise exception 'special_admin may only be set via bootstrap_special_admin()';
    end if;
  end if;

  if not v_special and not v_privileged then
    new.id                         := old.id;
    new.email                      := old.email;
    new.created_at                 := old.created_at;
    new.president_status           := old.president_status;
    new.president_requested_at     := old.president_requested_at;
    new.president_reviewed_at      := old.president_reviewed_at;
    new.president_reviewed_by      := old.president_reviewed_by;
    new.president_rejection_reason := old.president_rejection_reason;
  end if;

  return new;
end;
$$;

revoke execute on function public.lock_club_privileged_fields() from public, anon, authenticated;
revoke execute on function public.lock_profile_role()           from public, anon, authenticated;
