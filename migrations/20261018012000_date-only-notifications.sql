create or replace function public.on_event_written() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_club_name text; v_type text; v_title text;
begin
 select name into v_club_name from public.clubs where id=new.club_id;
 if tg_op='INSERT' then v_type:='event_created'; v_title:=coalesce(v_club_name,'Your club')||': '||new.title;
 elsif new.status='cancelled' and old.status<>'cancelled' then v_type:='event_cancelled';v_title:='Cancelled — '||new.title;
 elsif new.starts_at is distinct from old.starts_at or new.location is distinct from old.location or new.title is distinct from old.title or new.date_only is distinct from old.date_only then
 v_type:='event_updated';v_title:='Updated — '||new.title;
 else return new;end if;
 perform public.notify_club_members(new.club_id,v_type,'events',v_title,
 to_char(new.starts_at at time zone 'America/Los_Angeles',case when new.date_only then 'Mon DD, YYYY' else 'Mon DD, YYYY at HH12:MI AM' end)||coalesce(' · '||new.location,''),new.id);
 return new;
end $$;
