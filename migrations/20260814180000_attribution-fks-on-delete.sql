-- Account deletion must not be blocked by a student's own history.
--
-- Every "who did this" column referenced public.profiles with NO ACTION, so
-- deleting an account failed as soon as that student had posted an
-- announcement, uploaded a file, or triggered a single audit row. Attribution
-- columns now null out on delete: the club's content and the audit trail
-- survive, and the account can actually be removed. Ownership columns that
-- describe membership (club_members.user_id, notifications.user_id, …) keep
-- their existing ON DELETE CASCADE — that data is the person, not their work.

alter table public.audit_logs
  drop constraint audit_logs_actor_fkey,
  add constraint audit_logs_actor_fkey
    foreign key (actor) references public.profiles(id) on delete set null;

alter table public.announcements
  drop constraint announcements_created_by_fkey,
  add constraint announcements_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null,
  drop constraint announcements_updated_by_fkey,
  add constraint announcements_updated_by_fkey
    foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.club_events
  drop constraint club_events_created_by_fkey,
  add constraint club_events_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null,
  drop constraint club_events_updated_by_fkey,
  add constraint club_events_updated_by_fkey
    foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.club_files
  drop constraint club_files_uploaded_by_fkey,
  add constraint club_files_uploaded_by_fkey
    foreign key (uploaded_by) references public.profiles(id) on delete set null;

alter table public.club_notes
  drop constraint club_notes_created_by_fkey,
  add constraint club_notes_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null,
  drop constraint club_notes_updated_by_fkey,
  add constraint club_notes_updated_by_fkey
    foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.club_members
  drop constraint club_members_reviewed_by_fkey,
  add constraint club_members_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.club_claims
  drop constraint club_claims_reviewed_by_fkey,
  add constraint club_claims_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.clubs
  drop constraint clubs_created_by_fkey,
  add constraint clubs_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null,
  drop constraint clubs_reviewed_by_fkey,
  add constraint clubs_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id) on delete set null,
  drop constraint clubs_president_id_fkey,
  add constraint clubs_president_id_fkey
    foreign key (president_id) references public.profiles(id) on delete set null;

alter table public.profiles
  drop constraint profiles_president_reviewed_by_fkey,
  add constraint profiles_president_reviewed_by_fkey
    foreign key (president_reviewed_by) references public.profiles(id) on delete set null;
