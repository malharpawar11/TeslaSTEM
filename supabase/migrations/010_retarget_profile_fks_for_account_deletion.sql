-- Every reference to profiles(id) below was NO ACTION, so deleting a graduating
-- student who had ever submitted a club, authored an announcement, or triggered
-- an audit entry failed with a foreign key violation — from the app, from an
-- admin RPC, and from the Supabase dashboard alike. Their content should outlive
-- the account (an approved club must not vanish when its founder graduates), so
-- the reference is nulled rather than cascaded, and audit history is preserved.
alter table public.clubs drop constraint clubs_created_by_fkey;
alter table public.clubs add constraint clubs_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.clubs drop constraint clubs_president_id_fkey;
alter table public.clubs add constraint clubs_president_id_fkey
  foreign key (president_id) references public.profiles(id) on delete set null;

alter table public.clubs drop constraint clubs_reviewed_by_fkey;
alter table public.clubs add constraint clubs_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.announcements drop constraint announcements_created_by_fkey;
alter table public.announcements add constraint announcements_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.audit_logs drop constraint audit_logs_actor_fkey;
alter table public.audit_logs add constraint audit_logs_actor_fkey
  foreign key (actor) references public.profiles(id) on delete set null;

alter table public.profiles drop constraint profiles_president_reviewed_by_fkey;
alter table public.profiles add constraint profiles_president_reviewed_by_fkey
  foreign key (president_reviewed_by) references public.profiles(id) on delete set null;
