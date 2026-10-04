-- Student discovery and private member/board conversations. Additive migration.
alter table public.clubs add column career_tags text[] not null default '{}';

create table public.student_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interests text[] not null default '{}',
  careers text[] not null default '{}',
  availability jsonb not null default '[]',
  completed boolean not null default false,
  check (jsonb_typeof(availability) = 'array' and jsonb_array_length(availability) <= 28)
);
alter table public.student_preferences enable row level security;
revoke all on public.student_preferences from anon, authenticated;
grant select on public.student_preferences to authenticated;
create policy "own discovery preferences" on public.student_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create function public.save_student_preferences(p_interests text[], p_careers text[], p_availability jsonb, p_completed boolean)
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
      or (w->>'start') is null or (w->>'end') is null
      or (w->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or (w->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or (w->>'end') <= (w->>'start') then raise exception 'Invalid availability window'; end if;
  end loop;
  insert into public.student_preferences(user_id, interests, careers, availability, completed)
    values(auth.uid(), p_interests, p_careers, p_availability, p_completed)
    on conflict(user_id) do update set interests=excluded.interests, careers=excluded.careers,
      availability=excluded.availability, completed=excluded.completed;
end $$;

create table public.club_reviews (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check(rating between 1 and 5),
  body text not null check(length(btrim(body)) between 10 and 2000),
  updated_at timestamptz not null default now(),
  primary key(club_id, user_id)
);
create index club_reviews_user_idx on public.club_reviews(user_id);
alter table public.club_reviews enable row level security;
revoke all on public.club_reviews from anon, authenticated;
grant select, delete on public.club_reviews to authenticated;
create policy "read own review" on public.club_reviews for select to authenticated using(user_id=(select auth.uid()));
create policy "delete own review" on public.club_reviews for delete to authenticated using(user_id=(select auth.uid()));

create function public.save_club_review(p_club_id uuid, p_rating integer, p_body text)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if not exists(select 1 from public.club_members where club_id=p_club_id and user_id=auth.uid() and status='active')
    then raise exception 'Only current members can review this club'; end if;
  insert into public.club_reviews(club_id,user_id,rating,body) values(p_club_id,auth.uid(),p_rating,btrim(p_body))
    on conflict(club_id,user_id) do update set rating=excluded.rating,body=excluded.body,updated_at=now();
end $$;

create function public.club_reviews_public(p_club_id uuid)
returns table(user_id uuid, author text, rating integer, body text, updated_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select r.user_id, coalesce(nullif(p.display_name,''),'Club member'),r.rating,r.body,r.updated_at
  from public.club_reviews r join public.club_members m on m.club_id=r.club_id and m.user_id=r.user_id and m.status='active'
  join public.clubs c on c.id=r.club_id left join public.profiles p on p.id=r.user_id
  where r.club_id=p_club_id and c.status='approved' and c.is_active order by r.updated_at desc limit 100
$$;

create table public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check(sender_id <> recipient_id)
);
create index club_messages_sender_idx on public.club_messages(sender_id,club_id,recipient_id,created_at desc);
create index club_messages_recipient_idx on public.club_messages(recipient_id,club_id,sender_id,created_at desc);
alter table public.club_messages enable row level security;
revoke all on public.club_messages from anon, authenticated;
grant select on public.club_messages to authenticated;
create policy "private message participants" on public.club_messages for select to authenticated
  using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));

-- Always inspect membership without RLS recursion; at least one party must be leadership.
create function public.can_message_pair(p_club_id uuid, p_sender uuid, p_recipient uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select p_sender<>p_recipient and exists(
    select 1 from public.club_members a join public.club_members b on a.club_id=b.club_id
    join public.clubs c on c.id=a.club_id
    where a.club_id=p_club_id and a.user_id=p_sender and b.user_id=p_recipient
      and a.status='active' and b.status='active' and c.status='approved' and c.is_active
      and (a.role='president' or (a.role='board' and a.board_status='approved')
        or b.role='president' or (b.role='board' and b.board_status='approved')))
$$;
create function public.message_contacts(p_club_id uuid)
returns table(user_id uuid,name text,member_position text)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select m.user_id,coalesce(nullif(p.display_name,''),'Club member'),coalesce(m.position,initcap(m.role::text))
    from public.club_members m left join public.profiles p on p.id=m.user_id
    where m.club_id=p_club_id and public.can_message_pair(p_club_id,auth.uid(),m.user_id)
    order by m.role desc,p.display_name,m.user_id limit 500
$$;
create function public.send_club_message(p_club_id uuid,p_recipient uuid,p_body text)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if not public.can_message_pair(p_club_id,auth.uid(),p_recipient) then raise exception 'Messaging requires active membership and a board member or president'; end if;
  insert into public.club_messages(club_id,sender_id,recipient_id,body) values(p_club_id,auth.uid(),p_recipient,btrim(p_body));
end $$;
create function public.message_history(p_club_id uuid,p_peer uuid,p_before timestamptz default null)
returns setof public.club_messages language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select m.* from public.club_messages m where m.club_id=p_club_id
    and ((m.sender_id=auth.uid() and m.recipient_id=p_peer) or (m.recipient_id=auth.uid() and m.sender_id=p_peer))
    and (p_before is null or m.created_at<p_before) order by m.created_at desc,m.id desc limit 50
$$;
create function public.read_club_messages(p_club_id uuid,p_peer uuid)
returns void language sql security definer set search_path = pg_catalog, public, pg_temp as $$
  update public.club_messages set read_at=now() where club_id=p_club_id and recipient_id=auth.uid() and sender_id=p_peer and read_at is null
$$;
create function public.message_threads()
returns table(club_id uuid,club_name text,user_id uuid,name text,body text,created_at timestamptz,unread bigint)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  with mine as (
    select m.*,case when m.sender_id=auth.uid() then m.recipient_id else m.sender_id end peer
    from public.club_messages m where m.sender_id=auth.uid() or m.recipient_id=auth.uid()
  ), latest as (
    select distinct on(m.club_id,m.peer) m.* from mine m order by m.club_id,m.peer,m.created_at desc,m.id desc
  ) select l.club_id,c.name,l.peer,coalesce(nullif(p.display_name,''),'Club member'),l.body,l.created_at,
    (select count(*) from mine u where u.club_id=l.club_id and u.peer=l.peer and u.recipient_id=auth.uid() and u.read_at is null)
    from latest l join public.clubs c on c.id=l.club_id left join public.profiles p on p.id=l.peer
    order by l.created_at desc limit 100
$$;

revoke all on function public.save_student_preferences(text[],text[],jsonb,boolean),
  public.save_club_review(uuid,integer,text),public.club_reviews_public(uuid),
  public.can_message_pair(uuid,uuid,uuid),public.message_contacts(uuid),public.send_club_message(uuid,uuid,text),
  public.message_history(uuid,uuid,timestamptz),public.read_club_messages(uuid,uuid),public.message_threads()
  from public,anon,authenticated;
grant execute on function public.save_student_preferences(text[],text[],jsonb,boolean),
  public.save_club_review(uuid,integer,text),public.message_contacts(uuid),public.send_club_message(uuid,uuid,text),
  public.message_history(uuid,uuid,timestamptz),public.read_club_messages(uuid,uuid),public.message_threads() to authenticated;
grant execute on function public.club_reviews_public(uuid) to anon,authenticated;
