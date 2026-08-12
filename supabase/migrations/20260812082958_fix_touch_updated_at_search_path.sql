-- A mutable search_path on a trigger function is a hijacking vector; pin it.
-- A trigger function also fires as the table owner regardless of grants, so it
-- must never be reachable via /rpc.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
