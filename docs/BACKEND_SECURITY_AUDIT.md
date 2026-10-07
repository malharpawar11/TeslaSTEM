# Backend security audit — October 6, 2026

Production: Tesla-STEM-Clubs. The supplied report contained 95 findings. A new baseline scan returned 63; the post-fix scan cc81c658-a7ce-4cd6-8a51-e77ed5372fc0 returned 62 (47 critical, 0 warning, 15 info). All findings were retrieved with --limit 200. No findings were suppressed.

## Changes applied

- Narrowed club INSERT and UPDATE privileges to supported editable columns. Clients cannot forge ownership, approval metadata, archive state, or member counts.
- Revoked the client-callable log_audit RPC. Announcement audit events now originate from a database trigger with the real row ID and caller identity.
- Protected content identity, club, original author/uploader, and creation timestamp against direct UPDATE; the backend records updated_by.
- Capped search and dashboard limits at 50 and supplied a bounded fallback for NULL limits.
- Removed anonymous DML privileges on content, preferences, and push-token tables.

## Verification

Schema-only branch security-audit-oct6 was used for the migration and adversarial SDK tests, then merged after a conflict-free dry-run. Synthetic users/data stayed on the branch. Branch email verification was restored before merge; production still requires code verification. The branch was deleted after the merge. Production retains 47 clubs.

Tests cover approval and ownership escalation denials, privileged direct club-field writes, spoofed club submissions, forged audit actions, immutable content attribution, server-generated audit records, authorized content editing, membership/reviews, private messages and receipts, outsider denials, preferences isolation, and storage RLS. Typecheck, regression tests, and web export passed.

Catalog checks found no app table without RLS, no SECURITY DEFINER function with PUBLIC execution, no definer missing the pinned pg_catalog/public/pg_temp search path, and no runtime CREATE privilege on public. Definitions and grants were inspected alongside policies; helper functions intentionally bypass recursive RLS while binding decisions to auth.uid().

## Findings that remain visible

The advisor labels every callable SECURITY DEFINER function critical without evaluating its authorization body. Authenticated workflow RPCs enforce school-admin/club capabilities or caller identity; public reads project approved content; authorization helpers return caller-scoped decisions. Removing their required execution grants or making RLS helpers SECURITY INVOKER would break app operations or introduce recursive RLS. These findings remain visible; this audit does not claim a zero-finding report or formal penetration-test certification.

Seven SELECT-only tables intentionally accept mutations through guarded RPCs/triggers, not direct client writes. Adding permissive mutation policies would weaken this design. Eight unused-index notices reflect low scan counts; FK/RLS indexes are retained for account deletion, joins, and growth. The 39 performance warnings in the supplied report were already resolved by migration 20261004084000 and confirmed absent on the fresh scans.

Advisor slow-query failed on both scans. InsForge feedback 32cb8039-4d03-4b82-92c3-8585008854c4 records the platform failure. Separate diagnose db --check slow-queries returned no active slow queries; it does not substitute for historical query statistics.

## Disposition of each supplied finding

| Issue | Rule | Object | Disposition |
|---|---|---|---|
| 1 | dangerous-function | public.can_admin_club(c uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 2 | dangerous-function | public.is_special_admin() | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 3 | dangerous-function | public.save_club_review(p_club_id uuid, p_rating integer, p_body text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 4 | dangerous-function | public.assign_club_admin(p_club_id uuid, p_email text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 5 | dangerous-function | public.dashboard_feed(p_limit integer) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 6 | dangerous-function | public.approve_club(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 7 | dangerous-function | public.has_club_permission(c uuid, perm text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 8 | dangerous-function | public.set_member_permissions(p_club_id uuid, p_user_id uuid, p_position text, p_permissions text[]) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 9 | dangerous-function | public.transfer_club_ownership(p_club_id uuid, p_email text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 10 | dangerous-function | public.remove_club_member(p_club_id uuid, p_user_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 11 | dangerous-function | public.review_club_claim(p_claim_id uuid, p_approve boolean, p_reason text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 12 | dangerous-function | public.join_club(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 13 | dangerous-function | public.search_platform(p_query text, p_limit integer) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 14 | dangerous-function | public.verify_president(p_user_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 15 | dangerous-function | public.message_contacts(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 16 | dangerous-function | public.request_president_verification() | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 17 | dangerous-function | public.leave_club(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 18 | dangerous-function | public.can_admin_club(c uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 19 | dangerous-function | public.review_board_request(p_club_id uuid, p_user_id uuid, p_approve boolean, p_position text, p_permissions text[], p_reason text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 20 | dangerous-function | public.is_club_member(c uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 21 | dangerous-function | public.is_special_admin() | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 22 | dangerous-function | public.log_audit(p_action text, p_entity text, p_entity_id uuid, p_metadata jsonb) | Fixed: client execution revoked; server audit trigger replaces it. |
| 23 | dangerous-function | public.register_push_token(p_token text, p_platform text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 24 | dangerous-function | public.my_club_access(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 25 | dangerous-function | public.save_student_preferences(p_interests text[], p_careers text[], p_availability jsonb, p_completed boolean) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 26 | dangerous-function | public.list_club_claims() | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 27 | dangerous-function | public.is_club_member(c uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 28 | dangerous-function | public.read_club_messages(p_club_id uuid, p_peer uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 29 | dangerous-function | public.my_app_role() | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 30 | dangerous-function | public.my_app_role() | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 31 | dangerous-function | public.reject_club(p_club_id uuid, p_reason text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 32 | dangerous-function | public.claim_club(p_club_id uuid, p_position text, p_message text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 33 | dangerous-function | public.request_board_role(p_club_id uuid, p_position text, p_message text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 34 | dangerous-function | public.search_platform(p_query text, p_limit integer) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 35 | dangerous-function | public.reject_president(p_user_id uuid, p_reason text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 36 | dangerous-function | public.set_club_active(p_club_id uuid, p_active boolean) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 37 | dangerous-function | public.has_club_permission(c uuid, perm text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 38 | dangerous-function | public.club_reviews_public(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 39 | dangerous-function | public.remove_club_admin(p_club_id uuid, p_user_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 40 | dangerous-function | public.list_club_members(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 41 | dangerous-function | public.message_history(p_club_id uuid, p_peer uuid, p_before timestamp with time zone) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 42 | dangerous-function | public.list_club_admins(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 43 | dangerous-function | public.review_join_request(p_club_id uuid, p_user_id uuid, p_approve boolean, p_reason text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 44 | dangerous-function | public.mark_notifications_read(p_ids bigint[]) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 45 | dangerous-function | public.send_club_message(p_club_id uuid, p_recipient uuid, p_body text) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 46 | dangerous-function | public.set_notification_preferences(p_club_id uuid, p_announcements boolean, p_events boolean, p_files boolean, p_notes boolean, p_reminders boolean) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 47 | dangerous-function | public.club_reviews_public(p_club_id uuid) | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 48 | dangerous-function | public.message_threads() | Reviewed: guarded definer/public read/RLS helper; retained and unsuppressed. |
| 49 | missing-fk-index | public.announcements.announcements_updated_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 50 | rls-policy-perf | public.announcements (announcements written by permitted) | Resolved: fresh scans contain no warning-level performance findings. |
| 51 | missing-rls-index | public.club_files.uploaded_by | Resolved: fresh scans contain no warning-level performance findings. |
| 52 | missing-fk-index | public.club_claims.club_claims_user_id_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 53 | missing-fk-index | public.club_events.club_events_created_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 54 | rls-policy-perf | public.club_members (members read roster) | Resolved: fresh scans contain no warning-level performance findings. |
| 55 | missing-rls-index | public.clubs.status | Resolved: fresh scans contain no warning-level performance findings. |
| 56 | missing-fk-index | public.club_files.club_files_uploaded_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 57 | rls-policy-perf | public.club_claims (claims readable) | Resolved: fresh scans contain no warning-level performance findings. |
| 58 | rls-policy-perf | public.clubs (clubs submit pending) | Resolved: fresh scans contain no warning-level performance findings. |
| 59 | missing-fk-index | public.club_events.club_events_updated_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 60 | missing-rls-index | public.club_events.created_by | Resolved: fresh scans contain no warning-level performance findings. |
| 61 | missing-fk-index | public.club_notes.club_notes_created_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 62 | rls-policy-perf | public.club_events (events written by permitted) | Resolved: fresh scans contain no warning-level performance findings. |
| 63 | missing-fk-index | public.club_notes.club_notes_updated_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 64 | missing-fk-index | public.club_claims.club_claims_reviewed_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 65 | missing-fk-index | public.announcements.announcements_created_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 66 | rls-policy-perf | public.push_tokens (own push tokens) | Resolved: fresh scans contain no warning-level performance findings. |
| 67 | rls-policy-perf | public.profiles (read own profile or special admin) | Resolved: fresh scans contain no warning-level performance findings. |
| 68 | rls-policy-perf | public.club_files (files written by permitted) | Resolved: fresh scans contain no warning-level performance findings. |
| 69 | missing-fk-index | public.notifications.notifications_club_id_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 70 | rls-policy-perf | public.notifications (own notifications) | Resolved: fresh scans contain no warning-level performance findings. |
| 71 | missing-fk-index | public.club_admins.club_admins_user_id_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 72 | rls-policy-perf | public.club_admins (club admins visible to managers) | Resolved: fresh scans contain no warning-level performance findings. |
| 73 | missing-rls-index | public.club_notes.created_by | Resolved: fresh scans contain no warning-level performance findings. |
| 74 | missing-fk-index | public.club_members.club_members_reviewed_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 75 | missing-fk-index | public.clubs.clubs_reviewed_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 76 | missing-rls-index | public.announcements.created_by | Resolved: fresh scans contain no warning-level performance findings. |
| 77 | missing-fk-index | public.clubs.clubs_created_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 78 | missing-fk-index | public.audit_logs.audit_logs_actor_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 79 | rls-policy-perf | public.club_notes (notes written by permitted) | Resolved: fresh scans contain no warning-level performance findings. |
| 80 | rls-policy-perf | public.notifications (mark own notifications read) | Resolved: fresh scans contain no warning-level performance findings. |
| 81 | rls-policy-perf | public.notification_preferences (own notification preferences) | Resolved: fresh scans contain no warning-level performance findings. |
| 82 | missing-fk-index | public.clubs.clubs_president_id_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 83 | missing-fk-index | public.notification_preferences.notification_preferences_club_id_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 84 | rls-policy-perf | public.clubs (clubs read approved or own) | Resolved: fresh scans contain no warning-level performance findings. |
| 85 | missing-fk-index | public.profiles.profiles_president_reviewed_by_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 86 | missing-fk-index | public.club_messages.club_messages_club_id_fkey | Resolved: fresh scans contain no warning-level performance findings. |
| 87 | missing-rls-index | public.clubs.created_by | Resolved: fresh scans contain no warning-level performance findings. |
| 88 | rls-select-only | public.student_preferences | Intentional: direct writes denied; guarded RPC/trigger mutations. |
| 89 | rls-select-only | public.club_members | Intentional: direct writes denied; guarded RPC/trigger mutations. |
| 90 | rls-select-only | public.club_claims | Intentional: direct writes denied; guarded RPC/trigger mutations. |
| 91 | rls-select-only | public.club_messages | Intentional: direct writes denied; guarded RPC/trigger mutations. |
| 92 | rls-select-only | public.audit_logs | Intentional: direct writes denied; guarded RPC/trigger mutations. |
| 93 | rls-select-only | public.profiles | Intentional: direct writes denied; guarded RPC/trigger mutations. |
| 94 | unused-index | public.clubs_search_idx | Retained: low-use search/index capacity; no security defect. |
| 95 | rls-select-only | public.club_admins | Intentional: direct writes denied; guarded RPC/trigger mutations. |
