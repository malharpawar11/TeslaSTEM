import { insforge } from '@/lib/insforge';
import { callRpc, type RpcResult } from './result';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type AppNotification,
  type NotificationPrefs,
  type NotificationType,
} from '@/types/domain';

/**
 * The notification inbox and its preferences.
 *
 * Notifications are written only by database triggers (INSERT is revoked from
 * the app roles), so a client can never fabricate one for another student. The
 * single write a user is allowed is marking their own rows read.
 */

interface DbNotification {
  id: number;
  club_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

function toNotification(r: DbNotification): AppNotification {
  return {
    id: r.id,
    clubId: r.club_id,
    type: r.type,
    title: r.title,
    body: r.body,
    entityId: r.entity_id,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('notifications')
    .select('id, club_id, type, title, body, entity_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as DbNotification[]).map(toNotification);
}

export async function fetchUnreadCount(): Promise<number> {
  if (!insforge) return 0;
  const { data, error } = await insforge.database
    .from('notifications')
    .select('id')
    .is('read_at', null)
    .limit(100);
  if (error || !data) return 0;
  return data.length;
}

/** Marks the given notifications read, or the whole inbox when ids is omitted. */
export function markNotificationsRead(ids?: number[]): Promise<RpcResult> {
  return callRpc('mark_notifications_read', { p_ids: ids ?? null });
}

// ---------------------------------------------------------------------------
// Preferences: one global row plus one row per club the user overrode.
// ---------------------------------------------------------------------------

export interface PrefsRow extends NotificationPrefs {
  clubId: string | null;
}

export async function fetchNotificationPrefs(userId: string): Promise<PrefsRow[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('notification_preferences')
    .select('club_id, announcements, events, files, notes, reminders')
    .eq('user_id', userId)
    .limit(200);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    clubId: (r.club_id as string | null) ?? null,
    announcements: r.announcements as boolean,
    events: r.events as boolean,
    files: r.files as boolean,
    notes: r.notes as boolean,
    reminders: r.reminders as boolean,
  }));
}

/** Saves one preference row. `clubId: null` sets the account-wide default. */
export function saveNotificationPrefs(
  clubId: string | null,
  prefs: NotificationPrefs,
): Promise<RpcResult> {
  return callRpc('set_notification_preferences', {
    p_club_id: clubId,
    p_announcements: prefs.announcements,
    p_events: prefs.events,
    p_files: prefs.files,
    p_notes: prefs.notes,
    p_reminders: prefs.reminders,
  });
}

/** Resolves the effective settings for a club: club override, else global. */
export function effectivePrefs(rows: PrefsRow[], clubId: string | null): NotificationPrefs {
  const club = clubId ? rows.find((r) => r.clubId === clubId) : undefined;
  if (club) return club;
  const global = rows.find((r) => r.clubId === null);
  return global ?? DEFAULT_NOTIFICATION_PREFS;
}

/** Stores an Expo push token so a trusted backend job can deliver pushes. */
export function registerPushToken(token: string, platform: string): Promise<RpcResult> {
  return callRpc('register_push_token', { p_token: token, p_platform: platform });
}
