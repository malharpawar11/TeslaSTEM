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

/**
 * Approved clubs from Supabase, or the mock set when unconfigured/offline.
 * Only `status = 'approved'` rows are requested; RLS enforces the same rule
 * server-side, so a tampered client still cannot read pending/rejected clubs.
 */
export async function fetchClubs(): Promise<{ clubs: Club[]; source: ClubsSource }> {
  if (!supabase) return { clubs: mockClubs, source: 'mock' };
  const { data, error } = await supabase
    .from('clubs')
    .select(
      'id,name,category,description,meeting_day,meeting_time,location,advisor,contact_email,created_at,announcements(id,title,body,created_at)',
    )
    .eq('status', 'approved')
    .order('name');
  if (error || !data) return { clubs: mockClubs, source: 'mock' };
  return { clubs: (data as DbClub[]).map(fromDb), source: 'backend' };
}

export { isSupabaseConfigured };
