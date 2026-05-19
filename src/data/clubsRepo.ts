import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Club, ClubCategory, CATEGORIES } from '@/types/domain';
import {
  clubs as mockClubs,
  makeOfficers,
  makeAnnouncements,
  slugify,
  seed,
} from '@/data/mockData';

export type ClubsSource = 'backend' | 'mock';

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
  created_at: string | null;
  announcements?: { id: string; title: string; body: string; created_at: string | null }[];
}

function toCategory(value: string): ClubCategory {
  return (CATEGORIES as string[]).includes(value) ? (value as ClubCategory) : 'STEM';
}

/**
 * Maps a DB row to the UI's richer `Club` shape. The schema (clubs +
 * announcements) doesn't carry officers/socials/counts yet, so those are
 * synthesized deterministically from the name — identical to how mock clubs
 * are built, keeping the UI stable until real tables back them.
 */
function fromDb(row: DbClub): Club {
  const memberCount = 8 + Math.floor(seed(row.name + 'mem') * 38);
  const announcements = (row.announcements ?? [])
    .map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      date: (a.created_at ?? '').slice(0, 10),
    }))
    .sort((x, y) => y.date.localeCompare(x.date));
  return {
    id: row.id,
    name: row.name,
    advisor: row.advisor ?? 'TBD',
    location: row.location ?? 'TBD',
    day: row.meeting_day ?? 'TBD',
    time: row.meeting_time ?? 'TBD',
    category: toCategory(row.category),
    description: row.description,
    foundingYear: 2014 + Math.floor(seed(row.name + 'yr') * 11),
    memberCount,
    followersCount: memberCount + Math.floor(seed(row.name + 'fol') * memberCount * 2),
    contactEmail: row.contact_email ?? `${slugify(row.name).replace(/-/g, '')}@lwsd.org`,
    instagram: `@teslastem.${slugify(row.name).replace(/-/g, '')}`.slice(0, 30),
    website: '',
    officers: makeOfficers(row.name),
    announcements: announcements.length ? announcements : makeAnnouncements(row.name),
  };
}

/** Approved clubs from Supabase, or the mock set when unconfigured/offline. */
export async function fetchClubs(): Promise<{ clubs: Club[]; source: ClubsSource }> {
  if (!supabase) return { clubs: mockClubs, source: 'mock' };
  const { data, error } = await supabase
    .from('clubs')
    .select('id,name,category,description,meeting_day,meeting_time,location,advisor,contact_email,created_at,announcements(id,title,body,created_at)')
    .eq('approved', true)
    .order('name');
  if (error || !data) return { clubs: mockClubs, source: 'mock' };
  return { clubs: (data as DbClub[]).map(fromDb), source: 'backend' };
}

export interface ClubSubmission {
  name: string;
  category: ClubCategory;
  description: string;
  day: string;
  time: string;
  location: string;
  advisor: string;
  contactEmail: string;
}

export type SubmitResult =
  | { ok: true; remote: boolean }
  | { ok: false; error: string };

/**
 * Inserts a pending club (approved=false; a super-admin gates it later).
 * Requires a signed-in @lwsd.org user — RLS ties the row to created_by.
 * When the backend isn't configured the caller keeps its local demo flow.
 */
export async function submitClub(input: ClubSubmission): Promise<SubmitResult> {
  if (!supabase) return { ok: true, remote: false };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'Sign in with your @lwsd.org email to submit a club.' };

  const { error } = await supabase.from('clubs').insert({
    name: input.name,
    category: input.category,
    description: input.description,
    meeting_day: input.day,
    meeting_time: input.time,
    location: input.location,
    advisor: input.advisor,
    contact_email: input.contactEmail,
    approved: false,
    created_by: uid,
  });
  if (error) return { ok: false, error: error.message };

  await supabase.rpc('log_audit', {
    p_action: 'submit_club',
    p_entity: 'club',
    p_metadata: { name: input.name },
  });
  return { ok: true, remote: true };
}

export { isSupabaseConfigured };
