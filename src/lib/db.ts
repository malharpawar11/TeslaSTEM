import { supabase } from '@/lib/supabase';
import { sanitizeText } from '@/lib/security';
import type { Announcement, AuditLogEntry, Club, Profile } from '@/types/domain';

const CLUB_COLUMNS =
  'id,name,category,description,meeting_day,meeting_time,location,advisor,contact_email,status,created_by,president_id,president_email,rejection_reason,created_at,updated_at';
const PROFILE_COLUMNS =
  'id,email,display_name,role,president_status,president_rejection_reason,created_at';

/** RLS already filters rows by role, so queries stay simple and never pass a user id. */
export async function fetchApprovedClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select(CLUB_COLUMNS)
    .eq('status', 'approved')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Club[];
}

export async function fetchClub(clubId: string): Promise<Club | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select(CLUB_COLUMNS)
    .eq('id', clubId)
    .maybeSingle();
  if (error) throw error;
  return (data as Club) ?? null;
}

export async function fetchPendingClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select(CLUB_COLUMNS)
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Club[];
}

/** Reads the id from the cached session rather than a getUser() round trip. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function fetchAnnouncements(clubId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id,club_id,title,body,approved_for_school_wide,created_by,created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function isFollowing(clubId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const { data, error } = await supabase
    .from('club_followers')
    .select('club_id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Mirrors the `can_admin_club()` check RLS applies, so the UI can match it. */
export async function canAdminClub(clubId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_admin_club', { c: clubId });
  if (error) throw error;
  return Boolean(data);
}

export async function createAnnouncement(clubId: string, title: string, body: string) {
  const userId = await currentUserId();
  if (!userId) throw new Error('Sign in to post announcements.');
  const { error } = await supabase.from('announcements').insert({
    club_id: clubId,
    title: sanitizeText(title),
    body: sanitizeText(body),
    created_by: userId,
  });
  if (error) throw error;
}

/**
 * Permanent, self-service account deletion (an app store requirement). The Edge
 * Function verifies the caller's JWT and deletes only that user — the client
 * cannot name someone else.
 */
export async function deleteMyAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) {
    const detail =
      typeof data === 'object' && data && 'error' in data ? String((data as any).error) : '';
    throw new Error(detail || error.message);
  }
  await supabase.auth.signOut();
}

/**
 * The push token is stored alongside the follow so a trusted backend job can fan
 * out announcements. `user_id` must be set explicitly — RLS checks it, and the
 * column has no default.
 */
export async function followClub(clubId: string, expoPushToken: string | null) {
  const userId = await currentUserId();
  if (!userId) throw new Error('Sign in to follow clubs.');
  const { error } = await supabase
    .from('club_followers')
    .upsert(
      { club_id: clubId, user_id: userId, expo_push_token: expoPushToken },
      { onConflict: 'club_id,user_id' },
    );
  if (error) throw error;
}

export async function unfollowClub(clubId: string) {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('club_followers')
    .delete()
    .eq('club_id', clubId)
    .eq('user_id', userId);
  if (error) throw error;
}

export interface ClubSubmission {
  name: string;
  category: string;
  description: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  advisor: string;
  contactEmail: string;
}

/** Always submitted as `pending`; the RLS policy rejects any other status. */
export async function submitClub(input: ClubSubmission): Promise<Club> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('Sign in to submit a club.');
  const { data, error } = await supabase
    .from('clubs')
    .insert({
      name: sanitizeText(input.name),
      category: sanitizeText(input.category),
      description: sanitizeText(input.description),
      meeting_day: sanitizeText(input.meetingDay) || null,
      meeting_time: sanitizeText(input.meetingTime) || null,
      location: sanitizeText(input.location) || null,
      advisor: sanitizeText(input.advisor) || null,
      contact_email: sanitizeText(input.contactEmail) || null,
      created_by: user.id,
      president_id: user.id,
      president_email: user.email ?? null,
      status: 'pending',
    })
    .select(CLUB_COLUMNS)
    .single();
  if (error) throw error;
  return data as Club;
}

// --- Privileged actions. Each RPC re-checks the caller's role server-side. ---

export async function approveClub(clubId: string) {
  const { error } = await supabase.rpc('approve_club', { p_club_id: clubId });
  if (error) throw error;
}

export async function rejectClub(clubId: string, reason: string) {
  const { error } = await supabase.rpc('reject_club', {
    p_club_id: clubId,
    p_reason: sanitizeText(reason) || null,
  });
  if (error) throw error;
}

export async function requestPresidentVerification() {
  const { error } = await supabase.rpc('request_president_verification');
  if (error) throw error;
}

export async function fetchPendingPresidents(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('president_status', 'pending')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function verifyPresident(userId: string) {
  const { error } = await supabase.rpc('verify_president', { p_user_id: userId });
  if (error) throw error;
}

export async function rejectPresident(userId: string, reason: string) {
  const { error } = await supabase.rpc('reject_president', {
    p_user_id: userId,
    p_reason: sanitizeText(reason) || null,
  });
  if (error) throw error;
}

export async function fetchAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,actor,action,entity,entity_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}

export function describeDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/row-level security|permission denied/i.test(message)) {
    return 'You do not have permission to do that.';
  }
  if (/duplicate key/i.test(message)) return 'That already exists.';
  if (/fetch|network/i.test(message)) return 'Network problem. Check your connection and retry.';
  return message || 'Something went wrong.';
}
