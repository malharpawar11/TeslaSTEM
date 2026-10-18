-- Account-based messaging. Old encrypted messages/keys are intentionally retained.
create table public.student_directory (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 name text not null check(length(btrim(name)) between 2 and 80),
 grade integer not null check(grade between 9 and 12),
 handle text not null unique check(handle ~ '^[a-z0-9][a-z0-9_]{2,23}$')
);
alter table public.student_directory enable row level security;
revoke all on public.student_directory from public,anon,authenticated;
grant select on public.student_directory to authenticated;
create policy "read own directory settings" on public.student_directory for select to authenticated using(user_id=auth.uid());
create table public.direct_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(), read_at timestamptz,
 check(sender_id<>recipient_id)
);
create index direct_messages_sender on public.direct_messages(sender_id,created_at desc,id desc);
create index direct_messages_recipient on public.direct_messages(recipient_id,created_at desc,id desc);
alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from public,anon,authenticated;
grant select on public.direct_messages to authenticated;
create policy "participants read direct messages" on public.direct_messages for select to authenticated using(auth.uid() in (sender_id,recipient_id));
create table public.message_blocks (
 user_id uuid references public.profiles(id) on delete cascade,
 blocked_id uuid references public.profiles(id) on delete cascade,
 primary key(user_id,blocked_id),check(user_id<>blocked_id)
);
alter table public.message_blocks enable row level security;
revoke all on public.message_blocks from public,anon,authenticated;
create function public.messaging_account(p_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from auth.users where id=p_id and email_verified and lower(email) like '%@lwsd.org')
$$;
create function public.save_directory_profile(p_name text,p_grade integer,p_handle text) returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if not public.messaging_account(auth.uid()) then raise exception 'Verify your school account first'; end if;
 insert into public.student_directory values(auth.uid(),btrim(p_name),p_grade,lower(btrim(p_handle))) on conflict(user_id) do update set name=excluded.name,grade=excluded.grade,handle=excluded.handle;
 update public.profiles set display_name=btrim(p_name) where id=auth.uid();
end $$;
create function public.search_students(p_query text) returns table(user_id uuid,name text,grade integer,handle text) language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select p.id,coalesce(d.name,p.display_name,'Student'),d.grade,coalesce(d.handle,p.id::text) from public.profiles p left join public.student_directory d on d.user_id=p.id
 where public.messaging_account(auth.uid()) and public.messaging_account(p.id)
 and length(btrim(p_query)) between 2 and 100
 and (position(lower(btrim(p_query)) in lower(coalesce(d.name,p.display_name,'')))>0 or position(lower(btrim(p_query)) in d.handle)>0
 or lower(p.email)=lower(btrim(p_query)))
 order by coalesce(d.name,p.display_name),p.id limit 30
$$;
create function public.direct_contact(p_peer uuid) returns table(user_id uuid,name text,grade integer,handle text,blocked boolean) language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select p.id,coalesce(d.name,p.display_name,'Student'),d.grade,coalesce(d.handle,p.id::text),exists(select 1 from public.message_blocks b where b.user_id=auth.uid() and b.blocked_id=p.id)
 from public.profiles p left join public.student_directory d on d.user_id=p.id
 where p.id=p_peer and public.messaging_account(auth.uid()) and public.messaging_account(p.id)
$$;
create function public.send_direct_message(p_peer uuid,p_body text) returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare result uuid;
begin
 if auth.uid() is null or auth.uid()=p_peer or not public.messaging_account(auth.uid()) or not public.messaging_account(p_peer) then raise exception 'A verified recipient account is required'; end if;
 if not exists(select 1 from public.student_directory where user_id=auth.uid()) then raise exception 'Complete your student profile first'; end if;
 if exists(select 1 from public.message_blocks where (user_id=auth.uid() and blocked_id=p_peer) or (user_id=p_peer and blocked_id=auth.uid())) then raise exception 'This conversation is unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.direct_messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=30 then raise exception 'Please wait before sending more messages'; end if;
 insert into public.direct_messages(sender_id,recipient_id,body) values(auth.uid(),p_peer,btrim(p_body)) returning id into result;
 return result;
end $$;
create function public.direct_history(p_peer uuid,p_before timestamptz default null,p_before_id uuid default null) returns setof public.direct_messages language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select m.* from public.direct_messages m where public.messaging_account(auth.uid()) and ((m.sender_id=auth.uid() and m.recipient_id=p_peer) or (m.sender_id=p_peer and m.recipient_id=auth.uid()))
 and (p_before is null or (m.created_at,m.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))) order by m.created_at desc,m.id desc limit 50
$$;
create function public.direct_inbox() returns table(user_id uuid,name text,grade integer,handle text,body text,created_at timestamptz,unread bigint) language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 with mine as(select m.*,case when sender_id=auth.uid() then recipient_id else sender_id end peer from public.direct_messages m where auth.uid() in(sender_id,recipient_id) and public.messaging_account(auth.uid())), latest as(select distinct on(peer) * from mine order by peer,created_at desc,id desc)
 select l.peer,coalesce(d.name,p.display_name,'Student'),d.grade,coalesce(d.handle,p.id::text),l.body,l.created_at,(select count(*) from mine u where u.peer=l.peer and u.recipient_id=auth.uid() and u.read_at is null) from latest l join public.profiles p on p.id=l.peer left join public.student_directory d on d.user_id=l.peer order by l.created_at desc limit 100
$$;
create function public.read_direct_messages(p_peer uuid) returns void language sql security definer set search_path=pg_catalog,public,pg_temp as $$
 update public.direct_messages set read_at=now() where recipient_id=auth.uid() and sender_id=p_peer and read_at is null and public.messaging_account(auth.uid())
$$;
create function public.block_message_user(p_peer uuid,p_block boolean) returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if not public.messaging_account(auth.uid()) then raise exception 'Sign in first'; end if;
 if p_block then insert into public.message_blocks values(auth.uid(),p_peer) on conflict do nothing;
 else delete from public.message_blocks where user_id=auth.uid() and blocked_id=p_peer; end if;
end $$;
-- Only invalidation IDs travel over private per-user channels, never message bodies.
insert into realtime.channels(pattern,description,enabled) values('student-inbox:%','Private student message updates',true);
alter table realtime.channels enable row level security;
alter table realtime.messages enable row level security;
create policy "own student inbox subscription" on realtime.channels for select to authenticated using(pattern='student-inbox:%' and realtime.channel_name()='student-inbox:'||auth.uid()::text);
create function public.notify_direct_message() returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 perform realtime.publish('student-inbox:'||new.sender_id::text,'direct_message_changed',jsonb_build_object('id',new.id));
 perform realtime.publish('student-inbox:'||new.recipient_id::text,'direct_message_changed',jsonb_build_object('id',new.id));
 return new;
end $$;
create trigger direct_messages_live after insert or update of read_at on public.direct_messages for each row execute function public.notify_direct_message();
revoke all on function public.messaging_account(uuid),public.save_directory_profile(text,integer,text),public.search_students(text),public.direct_contact(uuid),public.send_direct_message(uuid,text),public.direct_history(uuid,timestamptz,uuid),public.direct_inbox(),public.read_direct_messages(uuid),public.block_message_user(uuid,boolean),public.notify_direct_message() from public,anon,authenticated;
grant execute on function public.save_directory_profile(text,integer,text),public.search_students(text),public.direct_contact(uuid),public.send_direct_message(uuid,text),public.direct_history(uuid,timestamptz,uuid),public.direct_inbox(),public.read_direct_messages(uuid),public.block_message_user(uuid,boolean) to authenticated;
