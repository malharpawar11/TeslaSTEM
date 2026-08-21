import { insforge } from '@/lib/insforge';
import type { ApprovalStatus } from '@/types/domain';

/**
 * Typed wrappers around the workflow RPCs and review queries from the
 * InsForge schema migration. Every privileged RPC re-checks the caller's
 * role inside the database (SECURITY DEFINER), so these wrappers are thin:
 * they never decide permission, they only surface the server's answer.
 */

export type RpcResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED = 'Backend not configured.';

/** Shared helper: invoke an RPC and normalise the result. */
async function callRpc(fn: string, args?: Record<string, unknown>): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await insforge.database.rpc(fn, args ?? {});
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Review queues: special-admin reads. RLS lets a special admin see every
// club/profile; a non-admin caller simply gets an empty list back.
// ---------------------------------------------------------------------------

export interface PendingClub {
  id: string;
  name: string;
  category: string;
  description: string;
  meetingDay: string | null;
  meetingTime: string | null;
  location: string | null;
  advisor: string | null;
  contactEmail: string | null;
  presidentEmail: string | null;
  status: ApprovalStatus;
  rejectionReason: string | null;
  createdAt: string | null;
}

export interface PendingPresident {
  id: string;
  email: string;
  displayName: string | null;
  status: ApprovalStatus;
  requestedAt: string | null;
}

export interface ClubAdminRow {
  userId: string;
  email: string;
  displayName: string | null;
}

/** Clubs awaiting review, oldest first. */
export async function fetchPendingClubs(): Promise<PendingClub[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('clubs')
    .select(
      'id,name,category,description,meeting_day,meeting_time,location,advisor,contact_email,president_email,status,rejection_reason,created_at',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    description: r.description as string,
    meetingDay: (r.meeting_day as string | null) ?? null,
    meetingTime: (r.meeting_time as string | null) ?? null,
    location: (r.location as string | null) ?? null,
    advisor: (r.advisor as string | null) ?? null,
    contactEmail: (r.contact_email as string | null) ?? null,
    presidentEmail: (r.president_email as string | null) ?? null,
    status: r.status as ApprovalStatus,
    rejectionReason: (r.rejection_reason as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
  }));
}

/** Users awaiting president verification, oldest request first. */
export async function fetchPendingPresidents(): Promise<PendingPresident[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('profiles')
    .select('id,email,display_name,president_status,president_requested_at')
    .eq('president_status', 'pending')
    .order('president_requested_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    email: r.email as string,
    displayName: (r.display_name as string | null) ?? null,
    status: r.president_status as ApprovalStatus,
    requestedAt: (r.president_requested_at as string | null) ?? null,
  }));
}

/** The admin roster of a club, via the list_club_admins RPC. */
export async function fetchClubAdmins(clubId: string): Promise<ClubAdminRow[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database.rpc('list_club_admins', { p_club_id: clubId });
  if (error || !data) return [];
  return (data as { user_id: string; email: string; display_name: string | null }[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    displayName: r.display_name,
  }));
}

// ---------------------------------------------------------------------------
// Workflow actions: each maps 1:1 to a SECURITY DEFINER RPC in the schema
// migration.
// ---------------------------------------------------------------------------

/** Student-initiated: ask the special admin to verify you as a president. */
export function requestPresidentVerification(): Promise<RpcResult> {
  return callRpc('request_president_verification');
}

/** Special-admin only: approve a club (also verifies its submitting president). */
export function approveClub(clubId: string): Promise<RpcResult> {
  return callRpc('approve_club', { p_club_id: clubId });
}

/** Special-admin only: reject a club with a reason the submitter can see. */
export function rejectClub(clubId: string, reason: string): Promise<RpcResult> {
  return callRpc('reject_club', { p_club_id: clubId, p_reason: reason });
}

/** Special-admin only: verify a president (lifts their role). */
export function verifyPresident(userId: string): Promise<RpcResult> {
  return callRpc('verify_president', { p_user_id: userId });
}

/** Special-admin only: reject a president verification request. */
export function rejectPresident(userId: string, reason: string): Promise<RpcResult> {
  return callRpc('reject_president', { p_user_id: userId, p_reason: reason });
}

/** Special-admin only: assign a club admin by their @lwsd.org email. */
export function assignClubAdmin(clubId: string, email: string): Promise<RpcResult> {
  return callRpc('assign_club_admin', { p_club_id: clubId, p_email: email });
}

/** Special-admin only: remove a club admin. */
export function removeClubAdmin(clubId: string, userId: string): Promise<RpcResult> {
  return callRpc('remove_club_admin', { p_club_id: clubId, p_user_id: userId });
}

// ---------------------------------------------------------------------------
// Club claims: a president asking for control of a club that already exists.
// ---------------------------------------------------------------------------

export interface ClubClaim {
  id: string;
  clubId: string;
  clubName: string;
  userId: string;
  email: string;
  displayName: string | null;
  position: string;
  message: string | null;
  createdAt: string | null;
}

/** Pending claims awaiting school-admin review. */
export async function fetchClubClaims(): Promise<ClubClaim[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database.rpc('list_club_claims', {});
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    clubId: r.club_id as string,
    clubName: r.club_name as string,
    userId: r.user_id as string,
    email: r.email as string,
    displayName: (r.display_name as string | null) ?? null,
    // `member_position`, not `position`; see list_club_members for why.
    position: (r.member_position as string | null) ?? 'President',
    message: (r.message as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
  }));
}

/** Special-admin only: grant or decline a claim on an existing club. */
export function reviewClubClaim(
  claimId: string,
  approve: boolean,
  reason?: string,
): Promise<RpcResult> {
  return callRpc('review_club_claim', {
    p_claim_id: claimId,
    p_approve: approve,
    p_reason: reason ?? null,
  });
}

/** Special-admin only: hand a club to a different president. */
export function transferClubOwnership(clubId: string, email: string): Promise<RpcResult> {
  return callRpc('transfer_club_ownership', { p_club_id: clubId, p_email: email });
}

/** Special-admin only: archive an inactive club (or bring it back). */
export function setClubActive(clubId: string, active: boolean): Promise<RpcResult> {
  return callRpc('set_club_active', { p_club_id: clubId, p_active: active });
}
