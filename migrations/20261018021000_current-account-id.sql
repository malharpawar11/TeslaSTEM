-- Return only the caller's server-verified identity. No user lookup or elevation.
CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$ SELECT auth.uid() $$;

REVOKE ALL ON FUNCTION public.current_account_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated;
