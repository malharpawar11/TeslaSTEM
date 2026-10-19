-- Private per-member invalidations contain IDs only; content reads still enforce RLS.
insert into realtime.channels(pattern,description,enabled) values('member-content:%','Private club announcement and calendar updates',true);
alter table realtime.channels enable row level security;
alter table realtime.messages enable row level security;
create policy "own club content updates" on realtime.channels for select to authenticated using(pattern='member-content:%' and realtime.channel_name()='member-content:'||auth.uid()::text);
create function public.publish_club_content_change() returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare c uuid; entity uuid; recipient uuid;
begin
 if tg_op='DELETE' then c:=old.club_id;entity:=old.id;else c:=new.club_id;entity:=new.id;end if;
 if exists(select 1 from public.clubs where id=c and status='approved' and is_active) then
  for recipient in select user_id from public.club_members where club_id=c and status='active'
    union select president_id from public.clubs where id=c and president_id is not null
  loop
   perform realtime.publish('member-content:'||recipient::text,'club_content_changed',jsonb_build_object('club_id',c,'id',entity,'area',case when tg_table_name='club_events' then 'events' else 'announcements' end));
  end loop;
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
revoke all on function public.publish_club_content_change() from public,anon,authenticated;
create trigger club_events_live after insert or update or delete on public.club_events for each row execute function public.publish_club_content_change();
create trigger announcements_live after insert or update or delete on public.announcements for each row execute function public.publish_club_content_change();
