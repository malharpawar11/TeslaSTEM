import { insforge } from '@/lib/insforge';
import { callRpc, currentUserId, NOT_CONFIGURED, type RpcResult } from './result';
import type { Announcement, ClubEvent, ClubFile, ClubNote, EventStatus } from '@/types/domain';

/**
 * Club content: announcements, events, files, and notes.
 *
 * These are ordinary table writes rather than RPCs, because RLS can express
 * the rule exactly: every INSERT/UPDATE/DELETE policy calls
 * `has_club_permission(club_id, '<area>')`, so a board member with only the
 * "events" grant is rejected by Postgres when they try to post an
 * announcement, regardless of what the client sends.
 */

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

// `announcements` has two foreign keys into `profiles` (created_by and
// updated_by), so the author embed has to name the constraint explicitly:
// an unqualified `profiles(...)` embed would be ambiguous and fail.
const ANNOUNCEMENT_COLUMNS =
  'id, club_id, title, body, pinned, created_at, created_by, author:profiles!announcements_created_by_fkey(display_name, email)';

interface DbAnnouncement {
  id: string;
  club_id: string | null;
  title: string;
  body: string;
  created_at: string | null;
  author?: { display_name: string | null; email: string | null } | null;
}

function toAnnouncement(row: DbAnnouncement): Announcement {
  const author = row.author?.display_name ?? row.author?.email ?? undefined;
  return {
    id: row.id,
    clubId: row.club_id,
    title: row.title,
    body: row.body,
    date: row.created_at ?? '',
    author,
  };
}

export async function fetchClubAnnouncements(clubId: string): Promise<Announcement[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error || !data) return [];
  return (data as unknown as DbAnnouncement[]).map(toAnnouncement);
}

/** School-wide announcements (club_id null), posted by the school admin. */
export async function fetchSchoolAnnouncements(): Promise<Announcement[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .is('club_id', null)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error || !data) return [];
  return (data as unknown as DbAnnouncement[]).map(toAnnouncement);
}

export async function createAnnouncement(
  clubId: string | null,
  title: string,
  body: string,
): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: 'Sign in to post an announcement.' };
  const { error } = await insforge.database.from('announcements').insert([
    { club_id: clubId, title: title.trim(), body: body.trim(), created_by: uid },
  ]);
  if (error) return { ok: false, error: error.message };
  await callRpc('log_audit', {
    p_action: 'create_announcement',
    p_entity: 'announcement',
    p_metadata: { club_id: clubId, title: title.trim() },
  });
  return { ok: true };
}

export async function updateAnnouncement(
  id: string,
  title: string,
  body: string,
): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  const { error } = await insforge.database
    .from('announcements')
    .update({ title: title.trim(), body: body.trim(), updated_by: uid })
    .eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await insforge.database.from('announcements').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const EVENT_COLUMNS =
  'id, club_id, title, description, event_type, starts_at, ends_at, location, organizer, status';

interface DbEvent {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  organizer: string | null;
  status: EventStatus;
  clubs?: { name: string } | null;
}

function toEvent(row: DbEvent): ClubEvent {
  return {
    id: row.id,
    clubId: row.club_id,
    clubName: row.clubs?.name,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    organizer: row.organizer,
    status: row.status,
  };
}

export async function fetchClubEvents(clubId: string, includePast = false): Promise<ClubEvent[]> {
  if (!insforge) return [];
  let query = insforge.database
    .from('club_events')
    .select(EVENT_COLUMNS)
    .eq('club_id', clubId);
  if (!includePast) {
    query = query.gte('starts_at', new Date(Date.now() - 2 * 3600 * 1000).toISOString());
  }
  const { data, error } = await query.order('starts_at', { ascending: true }).limit(100);
  if (error || !data) return [];
  return (data as unknown as DbEvent[]).map(toEvent);
}

/** Every upcoming event across the school; powers the Calendar tab. */
export async function fetchUpcomingEvents(limit = 100): Promise<ClubEvent[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('club_events')
    .select(`${EVENT_COLUMNS}, clubs:club_id(name)`)
    .eq('status', 'scheduled')
    .gte('starts_at', new Date(Date.now() - 12 * 3600 * 1000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as DbEvent[]).map(toEvent);
}

export interface EventInput {
  title: string;
  description: string;
  eventType: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  organizer: string;
}

export async function createEvent(clubId: string, input: EventInput): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: 'Sign in to create an event.' };
  const { error } = await insforge.database.from('club_events').insert([
    {
      club_id: clubId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      event_type: input.eventType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location.trim() || null,
      organizer: input.organizer.trim() || null,
      created_by: uid,
    },
  ]);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateEvent(id: string, input: EventInput): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  const { error } = await insforge.database
    .from('club_events')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      event_type: input.eventType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location.trim() || null,
      organizer: input.organizer.trim() || null,
      updated_by: uid,
    })
    .eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Cancelling keeps the row (members get a "cancelled" notification). */
export async function cancelEvent(id: string): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await insforge.database
    .from('club_events')
    .update({ status: 'cancelled' })
    .eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteEvent(id: string): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await insforge.database.from('club_events').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

interface DbFile {
  id: string;
  club_id: string;
  folder: string;
  title: string;
  description: string | null;
  file_url: string;
  file_key: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export async function fetchClubFiles(clubId: string): Promise<ClubFile[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('club_files')
    .select('id, club_id, folder, title, description, file_url, file_key, mime_type, size_bytes, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as unknown as DbFile[]).map((r) => ({
    id: r.id,
    clubId: r.club_id,
    folder: r.folder,
    title: r.title,
    description: r.description,
    fileUrl: r.file_url,
    fileKey: r.file_key,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  }));
}

/**
 * Uploads to the club-files bucket and records the row. Keys are written as
 * `clubs/<club_id>/<random>-<name>` because the storage policies derive the
 * owning club from the key: an upload aimed at another club's folder is
 * rejected by storage RLS, not just by this function.
 */
export async function uploadClubFile(
  clubId: string,
  file: { uri?: string; name: string; mimeType?: string | null; blob?: Blob },
  meta: { title: string; folder: string; description?: string },
): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: 'Sign in to upload files.' };

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
  const key = `clubs/${clubId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  let payload: Blob;
  if (file.blob) {
    payload = file.blob;
  } else if (file.uri) {
    const res = await fetch(file.uri);
    payload = await res.blob();
  } else {
    return { ok: false, error: 'Nothing to upload.' };
  }

  const { data, error } = await insforge.storage.from('club-files').upload(key, payload);
  if (error || !data) return { ok: false, error: error?.message ?? 'Upload failed.' };

  const { error: rowError } = await insforge.database.from('club_files').insert([
    {
      club_id: clubId,
      folder: meta.folder.trim() || 'General',
      title: meta.title.trim() || file.name,
      description: meta.description?.trim() || null,
      file_url: data.url,
      file_key: data.key,
      mime_type: file.mimeType ?? payload.type ?? null,
      size_bytes: payload.size ?? null,
      uploaded_by: uid,
    },
  ]);
  if (rowError) {
    // The object is orphaned otherwise: the row is what makes it visible.
    await insforge.storage.from('club-files').remove(data.key);
    return { ok: false, error: rowError.message };
  }
  return { ok: true };
}

export async function deleteClubFile(file: ClubFile): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await insforge.database.from('club_files').delete().eq('id', file.id);
  if (error) return { ok: false, error: error.message };
  // Best effort: the row is gone, so the object is already invisible.
  await insforge.storage.from('club-files').remove(file.fileKey);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notes / resources
// ---------------------------------------------------------------------------

interface DbNote {
  id: string;
  club_id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchClubNotes(clubId: string): Promise<ClubNote[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('club_notes')
    .select('id, club_id, title, body, category, pinned, created_at, updated_at')
    .eq('club_id', clubId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(120);
  if (error || !data) return [];
  return (data as unknown as DbNote[]).map((r) => ({
    id: r.id,
    clubId: r.club_id,
    title: r.title,
    body: r.body,
    category: r.category,
    pinned: r.pinned,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export interface NoteInput {
  title: string;
  body: string;
  category: string;
  pinned: boolean;
}

export async function createNote(clubId: string, input: NoteInput): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: 'Sign in to post notes.' };
  const { error } = await insforge.database.from('club_notes').insert([
    {
      club_id: clubId,
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category.trim() || 'General',
      pinned: input.pinned,
      created_by: uid,
    },
  ]);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateNote(id: string, input: NoteInput): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  const { error } = await insforge.database
    .from('club_notes')
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category.trim() || 'General',
      pinned: input.pinned,
      updated_by: uid,
    })
    .eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteNote(id: string): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await insforge.database.from('club_notes').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
