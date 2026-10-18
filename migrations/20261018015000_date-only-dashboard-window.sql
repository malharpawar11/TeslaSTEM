do $$
declare definition text; updated text;
begin
 definition:=pg_get_functiondef('public.dashboard_feed(integer)'::regprocedure);
 updated:=replace(definition,'ev.starts_at >= now() - interval ''2 hours''','(ev.starts_at >= now() - interval ''2 hours'' or (ev.date_only and (ev.starts_at at time zone ''America/Los_Angeles'')::date >= (now() at time zone ''America/Los_Angeles'')::date))');
 if updated=definition then raise exception 'Expected dashboard time window missing';end if;
 execute updated;
end $$;
