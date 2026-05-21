import { supabase } from '@/lib/supabase';
import type { ApprovalStatus } from '@/types/domain';

/**
 * Typed wrappers around the workflow RPCs and review queries from
 * supabase/migrations/003. Every privileged RPC re-checks the caller's role
 * inside the database (SECURITY DEFINER), so these wrappers are thin: they
 * never decide permission, they only surface the server's answer.
 */

export type RpcResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED = 'Backend not configured.';

/** Shared helper: invoke an RPC and normalise the result. */
async function callRpc(fn: string, args?: Record<string, unknown>): Promise<RpcResult> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await supabase.rpc(fn, args ?? {});
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Review queues — special-admin reads. RLS lets a special admin see every
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
  if (!supabase) return [];
  const { data, error } = await supabase
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
  if (!supabase) return [];
  const { data, error } = await supabase
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
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_club_admins', { p_club_id: clubId });
  if (error || !data) return [];
  return (data as { user_id: string; email: string; display_name: string | null }[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    displayName: r.display_name,
  }));
}

// ---------------------------------------------------------------------------
// Workflow actions — each maps 1:1 to a SECURITY DEFINER RPC in migration 003.
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
