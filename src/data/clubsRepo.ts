import { insforge, isInsforgeConfigured } from '@/lib/insforge';
import { currentUserId, NOT_CONFIGURED, type RpcResult } from './result';
import { Club, ClubCategory, CATEGORIES } from '@/types/domain';

export type ClubsResult =
  | { clubs: Club[]; error: null }
  | { clubs: []; error: string };

interface DbClub {
  id: string;
  name: string;
  category: string;
  description: string;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  advisor: string | null;
  contact_email: string | null;
  instagram: string | null;
  website: string | null;
  logo_url: string | null;
  banner_url: string | null;
  join_policy: string | null;
  member_count: number | null;
  president_id: string | null;
  created_at: string | null;
}

const CLUB_COLUMNS =
  'id,name,category,description,meeting_day,meeting_time,location,advisor,contact_email,' +
  'instagram,website,logo_url,banner_url,join_policy,member_count,president_id,created_at';

function toCategory(value: string): ClubCategory {
  return (CATEGORIES as string[]).includes(value) ? (value as ClubCategory) : 'STEM';
}

/**
 * Maps a DB row to the UI's `Club` shape using only values the row actually
 * carries. Officers and announcements are loaded separately by the screens
 * that show them, so a directory listing stays a single cheap query.
 */
function fromDb(row: DbClub): Club {
  return {
    id: row.id,
    name: row.name,
    advisor: row.advisor ?? 'TBD',
    location: row.location ?? 'TBD',
    day: row.meeting_day ?? 'TBD',
    time: row.meeting_time ?? 'TBD',
    category: toCategory(row.category),
    description: row.description,
    contactEmail: row.contact_email ?? '',
    instagram: row.instagram ?? undefined,
    website: row.website ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    bannerUrl: row.banner_url ?? undefined,
    joinPolicy: row.join_policy === 'approval' ? 'approval' : 'open',
    memberCount: row.member_count ?? 0,
    presidentId: row.president_id,
    officers: [],
    announcements: [],
  };
}

/**
 * Approved, active clubs from InsForge. On failure this reports the error
 * instead of falling back to a placeholder directory: showing students a
 * fabricated club list during an outage is worse than showing them that
 * something is wrong. RLS enforces the `approved` filter server-side too.
 */
export async function fetchClubs(): Promise<ClubsResult> {
  if (!insforge) {
    return {
      clubs: [],
      error:
        'Backend not configured. Set EXPO_PUBLIC_INSFORGE_URL and EXPO_PUBLIC_INSFORGE_ANON_KEY.',
    };
  }
  const { data, error } = await insforge.database
    .from('clubs')
    .select(CLUB_COLUMNS)
    .eq('status', 'approved')
    .eq('is_active', true)
    .order('name')
    .limit(500);
  if (error || !data) {
    return { clubs: [], error: error?.message ?? 'Could not load clubs. Pull to retry.' };
  }
  return { clubs: (data as unknown as DbClub[]).map(fromDb), error: null };
}

/** The club's leadership, shown on its public profile. */
export async function fetchClubOfficers(
  clubId: string,
): Promise<{ role: string; name: string; userId: string }[]> {
  if (!insforge) return [];
  const { data, error } = await insforge.database
    .from('club_members')
    .select('user_id, role, position, profiles(display_name, email)')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .in('role', ['president', 'board'])
    .limit(40);
  if (error || !data) return [];
  return (
    data as unknown as {
      user_id: string;
      role: string;
      position: string | null;
      profiles?: { display_name: string | null; email: string | null } | null;
    }[]
  )
    .filter((r) => r.role === 'president' || r.position)
    .map((r) => ({
      userId: r.user_id,
      role: r.position ?? (r.role === 'president' ? 'President' : 'Board Member'),
      name: r.profiles?.display_name ?? r.profiles?.email?.split('@')[0] ?? 'Member',
    }))
    .sort((a, b) => (a.role === 'President' ? -1 : b.role === 'President' ? 1 : 0));
}

export interface NewClubInput {
  name: string;
  category: ClubCategory;
  description: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  advisor: string;
  contactEmail: string;
  joinPolicy: 'open' | 'approval';
}

/**
 * Submits a club for school-admin approval. The row can only be created as
 * `pending` and owned by the caller — the RLS insert policy checks both, so a
 * student cannot self-approve a club by sending `status: 'approved'`.
 */
export async function submitClub(input: NewClubInput): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: 'Sign in to submit a club.' };
  const { error } = await insforge.database.from('clubs').insert([
    {
      name: input.name.trim(),
      category: input.category,
      description: input.description.trim(),
      meeting_day: input.meetingDay.trim() || null,
      meeting_time: input.meetingTime.trim() || null,
      location: input.location.trim() || null,
      advisor: input.advisor.trim() || null,
      contact_email: input.contactEmail.trim() || null,
      join_policy: input.joinPolicy,
      status: 'pending',
      created_by: uid,
    },
  ]);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export interface ClubSettingsInput {
  description: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  advisor: string;
  contactEmail: string;
  instagram: string;
  website: string;
  joinPolicy: 'open' | 'approval';
}

/**
 * Updates a club's profile. Only fields a club may control are sent; status,
 * ownership, and review columns are pinned to their old values by the
 * `lock_club_privileged_fields` trigger even if they were included.
 */
export async function updateClubSettings(
  clubId: string,
  input: ClubSettingsInput,
): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const { error } = await insforge.database
    .from('clubs')
    .update({
      description: input.description.trim(),
      meeting_day: input.meetingDay.trim() || null,
      meeting_time: input.meetingTime.trim() || null,
      location: input.location.trim() || null,
      advisor: input.advisor.trim() || null,
      contact_email: input.contactEmail.trim() || null,
      instagram: input.instagram.trim() || null,
      website: input.website.trim() || null,
      join_policy: input.joinPolicy,
    })
    .eq('id', clubId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Uploads a logo or banner to the public club-assets bucket. */
export async function uploadClubImage(
  clubId: string,
  kind: 'logo' | 'banner',
  file: { uri?: string; name: string; blob?: Blob },
): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60);
  const key = `clubs/${clubId}/${kind}-${Date.now()}-${safeName}`;
  let payload: Blob;
  if (file.blob) {
    payload = file.blob;
  } else if (file.uri) {
    payload = await (await fetch(file.uri)).blob();
  } else {
    return { ok: false, error: 'Nothing to upload.' };
  }
  const { data, error } = await insforge.storage.from('club-assets').upload(key, payload);
  if (error || !data) return { ok: false, error: error?.message ?? 'Upload failed.' };
  const patch =
    kind === 'logo'
      ? { logo_url: data.url, logo_key: data.key }
      : { banner_url: data.url, banner_key: data.key };
  const { error: rowError } = await insforge.database.from('clubs').update(patch).eq('id', clubId);
  return rowError ? { ok: false, error: rowError.message } : { ok: true };
}

export { isInsforgeConfigured };
