create type public.app_role as enum ('super_admin','club_admin','student');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, email text not null unique check (right(lower(email),9)='@lwsd.org'), display_name text, role app_role not null default 'student', created_at timestamptz default now());
create table public.clubs (id uuid primary key default gen_random_uuid(), name text not null, category text not null, description text not null, meeting_day text, meeting_time text, location text, advisor text, contact_email text, approved boolean not null default false, created_by uuid references public.profiles(id), created_at timestamptz default now(), updated_at timestamptz default now());
create table public.club_admins (club_id uuid references public.clubs(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, primary key (club_id,user_id));
create table public.club_followers (club_id uuid references public.clubs(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, expo_push_token text, primary key (club_id,user_id));
create table public.announcements (id uuid primary key default gen_random_uuid(), club_id uuid references public.clubs(id) on delete cascade, title text not null, body text not null, approved_for_school_wide boolean not null default false, created_by uuid references public.profiles(id), created_at timestamptz default now());
create table public.audit_logs (id bigserial primary key, actor uuid references public.profiles(id), action text not null, entity text not null, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz default now());
alter table public.profiles enable row level security; alter table public.clubs enable row level security; alter table public.club_admins enable row level security; alter table public.club_followers enable row level security; alter table public.announcements enable row level security; alter table public.audit_logs enable row level security;
create function public.is_super_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='super_admin') $$;
create function public.can_admin_club(c uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.is_super_admin() or exists(select 1 from club_admins where club_id=c and user_id=auth.uid()) $$;
create policy "read own profile or super" on profiles for select using (id=auth.uid() or public.is_super_admin());
create policy "update own profile limited" on profiles for update using (id=auth.uid()) with check (id=auth.uid() and role=(select role from profiles where id=auth.uid()));
create policy "approved clubs readable" on clubs for select using (approved or public.can_admin_club(id));
create policy "super approve clubs" on clubs for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "club admins update own clubs" on clubs for update using (public.can_admin_club(id)) with check (public.can_admin_club(id));
create policy "followers manage own follows" on club_followers for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "admins see followers" on club_followers for select using (public.can_admin_club(club_id));
create policy "announcements readable for approved clubs" on announcements for select using (exists(select 1 from clubs c where c.id=club_id and c.approved));
create policy "admins create club announcements" on announcements for insert with check (public.can_admin_club(club_id) and created_by=auth.uid());
create policy "admins update own club announcements" on announcements for update using (public.can_admin_club(club_id)) with check (public.can_admin_club(club_id));
create policy "super audit read" on audit_logs for select using (public.is_super_admin());
create policy "super audit insert" on audit_logs for insert with check (public.is_super_admin());

create index clubs_search_idx on public.clubs using gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(category,'') || ' ' || coalesce(description,'') || ' ' || coalesce(advisor,'')));
create index announcements_club_created_idx on public.announcements (club_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if right(lower(new.email), 9) <> '@lwsd.org' then
    raise exception 'Only @lwsd.org accounts are allowed';
  end if;
  insert into public.profiles (id, email, display_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public) values ('club-assets', 'club-assets', true) on conflict (id) do nothing;
create policy "public club assets readable" on storage.objects for select using (bucket_id = 'club-assets');
create policy "club asset uploads by authenticated users" on storage.objects for insert to authenticated with check (bucket_id = 'club-assets');
