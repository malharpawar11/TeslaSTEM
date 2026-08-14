-- Club platform, part 9: the caller’s own permissions for one club.

create or replace function public.my_club_access(p_club_id uuid) returns jsonb
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select jsonb_build_object(
    'is_member', public.is_club_member(p_club_id),
    'can_admin', public.can_admin_club(p_club_id),
    'membership_status', (select status from public.club_members
                           where club_id = p_club_id and user_id = auth.uid()),
    'member_role', (select role from public.club_members
                     where club_id = p_club_id and user_id = auth.uid()),
    'board_status', (select board_status from public.club_members
                      where club_id = p_club_id and user_id = auth.uid()),
    'position', (select position from public.club_members
                  where club_id = p_club_id and user_id = auth.uid()),
    'permissions', (
      select coalesce(jsonb_agg(k), '[]'::jsonb)
        from unnest(public.club_permission_keys()) k
       where public.has_club_permission(p_club_id, k)
    )
  )
$$;

-- ===========================================================================
