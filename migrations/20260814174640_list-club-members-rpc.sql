-- Roster for a club's management screens (emails are only exposed to people
-- who can already manage the club). The output column is `member_position`
-- rather than `position`: the backend's SQL guard rejects a RETURNS TABLE
-- column named after the POSITION keyword.
create or replace function public.list_club_members(p_club_id uuid)
returns table (
  user_id uuid, email text, display_name text,
  role public.club_member_role, status public.membership_status,
  board_status public.approval_status, member_position text, permissions text[],
  board_message text, joined_at timestamptz
)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select m.user_id, p.email, p.display_name, m.role, m.status, m.board_status,
         m.position, m.permissions, m.board_message, m.joined_at
    from public.club_members m
    join public.profiles p on p.id = m.user_id
   where m.club_id = p_club_id and public.has_club_permission(p_club_id, 'members')
   order by m.role desc, p.display_name nulls last
$$;

grant execute on function public.list_club_members(uuid) to authenticated;
