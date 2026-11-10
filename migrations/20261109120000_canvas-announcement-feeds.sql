-- Clubs connect their Canvas announcements feed once; the `canvas-sync`
-- function then copies each new Canvas post into `announcements` as a Canvas
-- link, so members see it on the site without anyone pasting links by hand.

-- The feed link is a private Canvas address (it carries an access token), so
-- only the club's officers with announcement rights and the school admin can
-- see or change it.
create table public.club_canvas_feeds (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  feed_url text not null check (
    length(feed_url) <= 500
    and feed_url ~* '^https://[a-z0-9][a-z0-9-]*\.instructure\.com/feeds/announcements/[a-z]+_[A-Za-z0-9]+\.atom$'
  ),
  last_synced_at timestamptz,
  last_error text,
  -- Canvas posts an officer removed from the site; the sync leaves them out.
  dismissed_entries text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.club_canvas_feeds enable row level security;
revoke all on public.club_canvas_feeds from anon;
revoke all on public.club_canvas_feeds from authenticated;
grant select, delete on public.club_canvas_feeds to authenticated;
grant insert (club_id, feed_url), update (feed_url) on public.club_canvas_feeds to authenticated;

create policy "feed visible to club announcers" on public.club_canvas_feeds
  for select to authenticated
  using (public.has_club_permission(club_id, 'announcements') or public.is_special_admin());
create policy "feed added by club announcers" on public.club_canvas_feeds
  for insert to authenticated
  with check (public.has_club_permission(club_id, 'announcements') or public.is_special_admin());
create policy "feed changed by club announcers" on public.club_canvas_feeds
  for update to authenticated
  using (public.has_club_permission(club_id, 'announcements') or public.is_special_admin())
  with check (public.has_club_permission(club_id, 'announcements') or public.is_special_admin());
create policy "feed removed by club announcers" on public.club_canvas_feeds
  for delete to authenticated
  using (public.has_club_permission(club_id, 'announcements') or public.is_special_admin());

-- Who changed the link, and when. A new link starts unsynced.
create function public.stamp_canvas_feed()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  -- Bookkeeping (sync status, dismissed posts) isn't an officer's edit.
  if tg_op = 'UPDATE' and new.feed_url is not distinct from old.feed_url then
    return new;
  end if;
  if current_user <> 'project_admin' then
    new.updated_by := auth.uid();
    new.updated_at := now();
    if tg_op = 'INSERT' or new.feed_url is distinct from old.feed_url then
      new.last_synced_at := null;
      new.last_error := null;
    end if;
  end if;
  return new;
end $$;

create trigger club_canvas_feeds_stamp
  before insert or update on public.club_canvas_feeds
  for each row execute function public.stamp_canvas_feed();

-- Posts copied from Canvas remember which feed entry they came from, so a sync
-- never adds the same post twice, and keep Canvas's author name.
alter table public.announcements
  add column canvas_entry_id text,
  add column canvas_author text;

alter table public.announcements
  add constraint announcements_canvas_entry_unique unique (club_id, canvas_entry_id);

-- Only the sync (running as project_admin) sets these two columns.
create function public.guard_canvas_entry()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user = 'project_admin' then return new; end if;
  if tg_op = 'INSERT' then
    new.canvas_entry_id := null;
    new.canvas_author := null;
  else
    new.canvas_entry_id := old.canvas_entry_id;
    new.canvas_author := old.canvas_author;
  end if;
  return new;
end $$;

create trigger announcements_guard_canvas_entry
  before insert or update on public.announcements
  for each row execute function public.guard_canvas_entry();

-- Removing a copied post keeps it removed: the sync skips dismissed entries.
create function public.remember_dismissed_canvas_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if old.canvas_entry_id is not null and old.club_id is not null then
    update public.club_canvas_feeds
       set dismissed_entries = array_append(dismissed_entries, old.canvas_entry_id)
     where club_id = old.club_id
       and not (old.canvas_entry_id = any(dismissed_entries));
  end if;
  return old;
end $$;

revoke all on function public.remember_dismissed_canvas_entry() from public;

create trigger announcements_remember_dismissed
  after delete on public.announcements
  for each row execute function public.remember_dismissed_canvas_entry();
