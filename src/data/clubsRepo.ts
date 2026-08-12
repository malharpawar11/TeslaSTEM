import { insforge, isInsforgeConfigured } from '@/lib/insforge';
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
  created_at: string | null;
  announcements?: { id: string; title: string; body: string; created_at: string | null }[];
}

function toCategory(value: string): ClubCategory {
  return (CATEGORIES as string[]).includes(value) ? (value as ClubCategory) : 'STEM';
}

/**
 * Maps a DB row to the UI's `Club` shape using only values the row actually
 * carries. Officers, member counts, founding years, and Instagram handles have
 * no columns yet, so they are left undefined and the UI hides those rows —
 * previously they were synthesized from the club name, which meant every real
 * club displayed invented officer names and a fictional member count.
 */
function fromDb(row: DbClub): Club {
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
    contactEmail: row.contact_email ?? '',
    officers: [],
    announcements,
  };
}

/**
 * Approved clubs from InsForge. On failure this reports the error instead of
 * falling back to a placeholder directory: showing students a fabricated club
 * list during an outage is worse than showing them that something is wrong.
 * RLS enforces the `approved` filter server-side too.
 */
export async function fetchClubs(): Promise<ClubsResult> {
  if (!insforge) {
    return { clubs: [], error: 'Backend not configured. Set EXPO_PUBLIC_INSFORGE_URL and EXPO_PUBLIC_INSFORGE_ANON_KEY.' };
  }
  const { data, error } = await insforge.database
    .from('clubs')
    .select(
      'id,name,category,description,meeting_day,meeting_time,location,advisor,contact_email,created_at,announcements(id,title,body,created_at)',
    )
    .eq('status', 'approved')
    .order('name');
  if (error || !data) {
    return { clubs: [], error: error?.message ?? 'Could not load clubs. Pull to retry.' };
  }
  return { clubs: (data as DbClub[]).map(fromDb), error: null };
}

export { isInsforgeConfigured };
