-- Preserve current authorization and feed behavior, adding only date metadata.
do $$
declare target regprocedure; definition text; updated text;
begin
 foreach target in array array['public.dashboard_feed(integer)'::regprocedure,'public.search_platform(text,integer)'::regprocedure] loop
 definition:=pg_get_functiondef(target);
 updated:=replace(definition,'''starts_at'', ev.starts_at, ''ends_at'', ev.ends_at','''date_only'', ev.date_only, ''starts_at'', ev.starts_at, ''ends_at'', ev.ends_at');
 updated:=replace(updated,'''starts_at'', e.starts_at, ''ends_at'', e.ends_at','''date_only'', e.date_only, ''starts_at'', e.starts_at, ''ends_at'', e.ends_at');
 if updated=definition then raise exception 'Expected event feed projection missing: %',target;end if;
 execute updated;
 end loop;
end $$;
