// Mirrors the `app_role` enum in Postgres. `super_admin` no longer exists — the
// single school-wide owner is `special_admin`.
export type Role = 'special_admin' | 'verified_president' | 'club_admin' | 'student';

// Mirrors the `approval_status` enum.
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  president_status: ApprovalStatus | null;
  president_rejection_reason: string | null;
  created_at: string | null;
}

export interface Club {
  id: string;
  name: string;
  category: string;
  description: string;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  advisor: string | null;
  contact_email: string | null;
  status: ApprovalStatus;
  created_by: string | null;
  president_id: string | null;
  president_email: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Announcement {
  id: string;
  club_id: string;
  title: string;
  body: string;
  approved_for_school_wide: boolean;
  created_by: string | null;
  created_at: string | null;
}

export interface AuditLogEntry {
  id: number;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
}

export const ROLE_LABELS: Record<Role, string> = {
  special_admin: 'Special Admin',
  verified_president: 'Verified President',
  club_admin: 'Club Admin',
  student: 'Student',
};
