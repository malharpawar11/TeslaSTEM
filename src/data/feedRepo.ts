import { callRpcValue } from './result';
import type {
  Announcement,
  AppNotification,
  ClubEvent,
  ClubFile,
  ClubMemberRole,
  MembershipStatus,
  NotificationType,
} from '@/types/domain';

/**
 * The personal dashboard and platform search.
 *
 * Both are single SECURITY DEFINER functions rather than a fan of client-side
 * queries: one round trip instead of six, and the visibility rules (member-only
 * files and notes, approved clubs only) are decided in SQL where they cannot be
 * bypassed by editing a request.
 */

export interface DashboardClub {
  id: string;
  name: string;
  category: string;
  logoUrl: string | null;
  memberCount: number;
  role: ClubMemberRole;
  position: string | null;
  status: MembershipStatus;
}

export interface Dashboard {
  clubs: DashboardClub[];
  events: ClubEvent[];
  announcements: Announcement[];
  files: ClubFile[];
  notifications: AppNotification[];
  unreadCount: number;
}

export const EMPTY_DASHBOARD: Dashboard = {
  clubs: [],
  events: [],
  announcements: [],
  files: [],
  notifications: [],
  unreadCount: 0,
};

interface RawDashboard {
  clubs?: Record<string, unknown>[];
  events?: Record<string, unknown>[];
  announcements?: Record<string, unknown>[];
  files?: Record<string, unknown>[];
  notifications?: Record<string, unknown>[];
  unread_count?: number | string;
}

function toEvent(r: Record<string, unknown>): ClubEvent {
  return {
    id: r.id as string,
    clubId: r.club_id as string,
    clubName: (r.club_name as string | undefined) ?? undefined,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    eventType: (r.event_type as string) ?? 'Meeting',
    startsAt: r.starts_at as string,
    endsAt: (r.ends_at as string | null) ?? null,
    location: (r.location as string | null) ?? null,
    organizer: (r.organizer as string | null) ?? null,
    status: (r.status as ClubEvent['status']) ?? 'scheduled',
  };
}

function toAnnouncement(r: Record<string, unknown>): Announcement {
  return {
    id: r.id as string,
    clubId: (r.club_id as string | null) ?? null,
    clubName: (r.club_name as string | undefined) ?? undefined,
    title: r.title as string,
    body: r.body as string,
    date: (r.created_at as string) ?? '',
    author: (r.author as string | undefined) ?? undefined,
  };
}

function toFile(r: Record<string, unknown>): ClubFile {
  return {
    id: r.id as string,
    clubId: r.club_id as string,
    clubName: (r.club_name as string | undefined) ?? undefined,
    folder: (r.folder as string) ?? 'General',
    title: r.title as string,
    description: null,
    fileUrl: r.file_url as string,
    fileKey: (r.file_key as string) ?? '',
    mimeType: (r.mime_type as string | null) ?? null,
    sizeBytes: null,
    createdAt: (r.created_at as string) ?? '',
  };
}

export async function fetchDashboard(limit = 10): Promise<Dashboard> {
  const res = await callRpcValue<RawDashboard>('dashboard_feed', { p_limit: limit });
  if (!res.ok || !res.value) return EMPTY_DASHBOARD;
  const raw = res.value;
  return {
    clubs: (raw.clubs ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      category: r.category as string,
      logoUrl: (r.logo_url as string | null) ?? null,
      memberCount: Number(r.member_count ?? 0),
      role: (r.role as ClubMemberRole) ?? 'member',
      position: (r.position as string | null) ?? null,
      status: (r.status as MembershipStatus) ?? 'active',
    })),
    events: (raw.events ?? []).map(toEvent),
    announcements: (raw.announcements ?? []).map(toAnnouncement),
    files: (raw.files ?? []).map(toFile),
    notifications: (raw.notifications ?? []).map((r) => ({
      id: Number(r.id),
      clubId: (r.club_id as string | null) ?? null,
      type: r.type as NotificationType,
      title: r.title as string,
      body: (r.body as string | null) ?? null,
      entityId: (r.entity_id as string | null) ?? null,
      readAt: (r.read_at as string | null) ?? null,
      createdAt: r.created_at as string,
    })),
    unreadCount: Number(raw.unread_count ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchClubHit {
  id: string;
  name: string;
  category: string;
  description: string;
  logoUrl: string | null;
}

export interface SearchNoteHit {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  body: string;
  category: string;
  updatedAt: string;
}

export interface SearchResults {
  clubs: SearchClubHit[];
  announcements: Announcement[];
  events: ClubEvent[];
  files: ClubFile[];
  notes: SearchNoteHit[];
}

export const EMPTY_SEARCH: SearchResults = {
  clubs: [],
  announcements: [],
  events: [],
  files: [],
  notes: [],
};

interface RawSearch {
  clubs?: Record<string, unknown>[];
  announcements?: Record<string, unknown>[];
  events?: Record<string, unknown>[];
  files?: Record<string, unknown>[];
  notes?: Record<string, unknown>[];
}

export async function searchPlatform(query: string, limit = 8): Promise<SearchResults> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return EMPTY_SEARCH;
  const res = await callRpcValue<RawSearch>('search_platform', {
    p_query: trimmed,
    p_limit: limit,
  });
  if (!res.ok || !res.value) return EMPTY_SEARCH;
  const raw = res.value;
  return {
    clubs: (raw.clubs ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      category: r.category as string,
      description: (r.description as string) ?? '',
      logoUrl: (r.logo_url as string | null) ?? null,
    })),
    announcements: (raw.announcements ?? []).map(toAnnouncement),
    events: (raw.events ?? []).map(toEvent),
    files: (raw.files ?? []).map(toFile),
    notes: (raw.notes ?? []).map((r) => ({
      id: r.id as string,
      clubId: r.club_id as string,
      clubName: (r.club_name as string) ?? '',
      title: r.title as string,
      body: (r.body as string) ?? '',
      category: (r.category as string) ?? 'General',
      updatedAt: (r.updated_at as string) ?? '',
    })),
  };
}

export function searchResultCount(r: SearchResults): number {
  return r.clubs.length + r.announcements.length + r.events.length + r.files.length + r.notes.length;
}
