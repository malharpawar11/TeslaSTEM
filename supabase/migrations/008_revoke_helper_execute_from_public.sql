-- The previous revoke targeted the `anon` role, but EXECUTE was actually held
-- through the PUBLIC pseudo-role, so anon could still call the helpers via
-- /rest/v1/rpc/*. Revoke from PUBLIC and re-grant only where needed.
revoke execute on function public.is_special_admin()                 from public;
revoke execute on function public.is_super_admin()                   from public;
revoke execute on function public.my_app_role()                      from public;
revoke execute on function public.can_admin_club(uuid)               from public;
revoke execute on function public.log_audit(text, text, uuid, jsonb) from public;
revoke execute on function public.list_club_admins(uuid)             from public;
revoke execute on function public.approve_club(uuid)                 from public;
revoke execute on function public.reject_club(uuid, text)            from public;
revoke execute on function public.verify_president(uuid)             from public;
revoke execute on function public.reject_president(uuid, text)       from public;
revoke execute on function public.assign_club_admin(uuid, text)      from public;
revoke execute on function public.remove_club_admin(uuid, uuid)      from public;
revoke execute on function public.request_president_verification()   from public;

grant execute on function public.is_special_admin()                 to authenticated, service_role;
grant execute on function public.is_super_admin()                   to authenticated, service_role;
grant execute on function public.my_app_role()                      to authenticated, service_role;
grant execute on function public.can_admin_club(uuid)               to authenticated, service_role;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated, service_role;
grant execute on function public.list_club_admins(uuid)             to authenticated, service_role;
grant execute on function public.approve_club(uuid)                 to authenticated, service_role;
grant execute on function public.reject_club(uuid, text)            to authenticated, service_role;
grant execute on function public.verify_president(uuid)             to authenticated, service_role;
grant execute on function public.reject_president(uuid, text)       to authenticated, service_role;
grant execute on function public.assign_club_admin(uuid, text)      to authenticated, service_role;
grant execute on function public.remove_club_admin(uuid, uuid)      to authenticated, service_role;
grant execute on function public.request_president_verification()   to authenticated, service_role;
