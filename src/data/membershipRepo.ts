import { insforge } from '@/lib/insforge';
import { callRpc, callRpcValue, NOT_CONFIGURED, type RpcResult, type ValueResult } from './result';
import {
  NO_ACCESS,
  type ApprovalStatus,
  type ClubAccess,
  type ClubMemberRole,
  type ClubMemberRow,
  type ClubPermission,
  type Membership,
  type MembershipStatus,
} from '@/types/domain';

/**
 * Memberships, board requests, and per-club permissions.
 *
 * Every write here is an RPC, not a table write: `club_members` has INSERT /
 * UPDATE / DELETE revoked from the app roles, so role, position, permissions,
 * and approval state can only change through a SECURITY DEFINER function that
 * re-checks the caller. Changing an id in a request therefore buys nothing.
 */

interface AccessJson {
  is_member?: boolean;
  can_admin?: boolean;
  membership_status?: MembershipStatus | null;
  member_role?: ClubMemberRole | null;
  board_status?: ApprovalStatus | null;
  position?: string | null;
  permissions?: string[];
}

/** What the caller may do in one club, straight from the database. */
export async function fetchClubAccess(clubId: string): Promise<ClubAccess> {
  const res = await callRpcValue<AccessJson>('my_club_access', { p_club_id: clubId });
  if (!res.ok || !res.value) return NO_ACCESS;
  const j = res.value;
  return {
    isMember: j.is_member === true,
    canAdmin: j.can_admin === true,
    membershipStatus: j.membership_status ?? null,
    memberRole: j.member_role ?? null,
    boardStatus: j.board_status ?? null,
    position: j.position ?? null,
    permissions: (j.permissions ?? []) as ClubPermission[],
  };
}

/** Every membership belonging to the signed-in user. */
export async function fetchMyMemberships(userId: string): Promise<Membership[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('club_members')
    .select('club_id, role, status, board_status, position')
    .eq('user_id', userId)
    .limit(200);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    clubId: r.club_id as string,
    role: r.role as ClubMemberRole,
    status: r.status as MembershipStatus,
    boardStatus: (r.board_status as ApprovalStatus | null) ?? null,
    position: (r.position as string | null) ?? null,
  }));
}

/** Join a club. Resolves to 'active', or 'pending' when the club vets joins. */
export async function joinClub(clubId: string): Promise<ValueResult<MembershipStatus>> {
  return callRpcValue<MembershipStatus>('join_club', { p_club_id: clubId });
}

export function leaveClub(clubId: string): Promise<RpcResult> {
  return callRpc('leave_club', { p_club_id: clubId });
}

/** Ask the club's president for board access. */
export function requestBoardRole(
  clubId: string,
  position: string,
  message?: string,
): Promise<RpcResult> {
  return callRpc('request_board_role', {
    p_club_id: clubId,
    p_position: position,
    p_message: message ?? null,
  });
}

/** The full roster; only returns rows if the caller may manage members. */
export async function fetchClubMembers(clubId: string): Promise<ClubMemberRow[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database.rpc('list_club_members', { p_club_id: clubId });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    userId: r.user_id as string,
    email: r.email as string,
    displayName: (r.display_name as string | null) ?? null,
    role: r.role as ClubMemberRole,
    status: r.status as MembershipStatus,
    boardStatus: (r.board_status as ApprovalStatus | null) ?? null,
    // The RPC returns `member_position`: a RETURNS TABLE column named
    // `position` is rejected by the backend's SQL guard.
    position: (r.member_position as string | null) ?? null,
    permissions: ((r.permissions as string[] | null) ?? []) as ClubPermission[],
    boardMessage: (r.board_message as string | null) ?? null,
    joinedAt: (r.joined_at as string | null) ?? null,
  }));
}

export function reviewJoinRequest(
  clubId: string,
  userId: string,
  approve: boolean,
  reason?: string,
): Promise<RpcResult> {
  return callRpc('review_join_request', {
    p_club_id: clubId,
    p_user_id: userId,
    p_approve: approve,
    p_reason: reason ?? null,
  });
}

export function reviewBoardRequest(
  clubId: string,
  userId: string,
  approve: boolean,
  position?: string,
  permissions?: ClubPermission[],
  reason?: string,
): Promise<RpcResult> {
  return callRpc('review_board_request', {
    p_club_id: clubId,
    p_user_id: userId,
    p_approve: approve,
    p_position: position ?? null,
    p_permissions: permissions ?? [],
    p_reason: reason ?? null,
  });
}

export function setMemberPermissions(
  clubId: string,
  userId: string,
  position: string,
  permissions: ClubPermission[],
): Promise<RpcResult> {
  return callRpc('set_member_permissions', {
    p_club_id: clubId,
    p_user_id: userId,
    p_position: position,
    p_permissions: permissions,
  });
}

export function removeClubMember(clubId: string, userId: string): Promise<RpcResult> {
  return callRpc('remove_club_member', { p_club_id: clubId, p_user_id: userId });
}

/** Ask the school admin for administrative access to an existing club. */
export function claimClub(clubId: string, position: string, message?: string): Promise<RpcResult> {
  return callRpc('claim_club', {
    p_club_id: clubId,
    p_position: position,
    p_message: message ?? null,
  });
}

/** The caller's own pending claims, so the UI can say "under review". */
export async function fetchMyClaims(userId: string): Promise<{ clubId: string; status: ApprovalStatus }[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('club_claims')
    .select('club_id, status')
    .eq('user_id', userId)
    .limit(50);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    clubId: r.club_id as string,
    status: r.status as ApprovalStatus,
  }));
}

export { NOT_CONFIGURED };
