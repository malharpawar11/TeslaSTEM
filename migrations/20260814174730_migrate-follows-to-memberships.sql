-- 15. MIGRATE EXISTING DATA
--     Follows become memberships (one source of truth for "my clubs"), and
--     stored Expo tokens move to push_tokens.
-- ===========================================================================
insert into public.club_members (club_id, user_id, role, status)
select f.club_id, f.user_id, 'member', 'active'
  from public.club_followers f
 where exists (select 1 from public.clubs c where c.id = f.club_id)
on conflict (club_id, user_id) do nothing;

insert into public.push_tokens (token, user_id, platform)
select distinct on (f.expo_push_token) f.expo_push_token, f.user_id, 'expo'
  from public.club_followers f
 where f.expo_push_token is not null
on conflict (token) do nothing;

-- Existing club presidents become president members of their own club.
insert into public.club_members (club_id, user_id, role, status, board_status, position, permissions)
select c.id, c.president_id, 'president', 'active', 'approved', 'President', public.club_permission_keys()
  from public.clubs c
 where c.president_id is not null
on conflict (club_id, user_id) do update
  set role = 'president', status = 'active', board_status = 'approved',
      position = 'President', permissions = public.club_permission_keys();

update public.clubs c
   set member_count = (select count(*) from public.club_members m
                        where m.club_id = c.id and m.status = 'active');

drop table public.club_followers;
