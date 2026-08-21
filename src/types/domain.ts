export type ClubCategory =
  | 'STEM'
  | 'Arts'
  | 'Service'
  | 'Sports'
  | 'Culture'
  | 'Academic'
  | 'Business'
  | 'Wellness';

/** Lifecycle shared by club approval and president verification. */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** The four roles defined in the InsForge schema migration. Mirrors the DB enum. */
export type AppRole = 'special_admin' | 'verified_president' | 'club_admin' | 'student';

/** Membership ladder inside a single club. Mirrors `public.club_member_role`. */
export type ClubMemberRole = 'member' | 'board' | 'president';

/** Mirrors `public.membership_status`. */
export type MembershipStatus = 'pending' | 'active' | 'rejected' | 'removed';

/**
 * The permission keys a president can grant a board member. Must stay in sync
 * with `public.club_permission_keys()`; the database re-checks every one of
 * them, so a key that only exists here simply never authorizes anything.
 */
export type ClubPermission =
  | 'announcements'
  | 'events'
  | 'files'
  | 'notes'
  | 'members'
  | 'board'
  | 'settings';

export const CLUB_PERMISSIONS: ClubPermission[] = [
  'announcements',
  'events',
  'files',
  'notes',
  'members',
  'board',
  'settings',
];

export const PERMISSION_LABELS: Record<ClubPermission, string> = {
  announcements: 'Post announcements',
  events: 'Create & edit events',
  files: 'Upload files',
  notes: 'Write notes & resources',
  members: 'Manage members',
  board: 'Manage the board',
  settings: 'Edit club settings',
};

/** Positions a president can assign. Anything else is entered as free text. */
export const BOARD_POSITIONS = [
  'Vice President',
  'Secretary',
  'Treasurer',
  'Officer',
  'Event Coordinator',
  'Marketing / Social Media',
] as const;

/** Sensible default permission sets, offered as one-tap presets. */
export const POSITION_PRESETS: Record<string, ClubPermission[]> = {
  'Vice President': ['announcements', 'events', 'files', 'notes', 'members'],
  Secretary: ['announcements', 'notes', 'events'],
  Treasurer: ['files', 'notes'],
  Officer: ['announcements'],
  'Event Coordinator': ['events', 'announcements'],
  'Marketing / Social Media': ['announcements'],
};

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  /** Display name (or email) of whoever posted it, when the row carries it. */
  author?: string;
  clubId?: string | null;
  clubName?: string;
}

export interface Officer {
  role: string;
  name: string;
  userId?: string;
}

export type EventStatus = 'scheduled' | 'cancelled';

export interface ClubEvent {
  id: string;
  clubId: string;
  clubName?: string;
  title: string;
  description: string | null;
  eventType: string;
  /** ISO timestamps straight from Postgres. */
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  organizer: string | null;
  status: EventStatus;
}

export interface ClubFile {
  id: string;
  clubId: string;
  clubName?: string;
  folder: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface ClubNote {
  id: string;
  clubId: string;
  clubName?: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  updatedAt: string;
  createdAt: string;
}

export type NotificationType =
  | 'announcement'
  | 'school_announcement'
  | 'event_created'
  | 'event_updated'
  | 'event_cancelled'
  | 'event_reminder'
  | 'file_uploaded'
  | 'note_posted'
  | 'join_request'
  | 'board_request'
  | 'membership_approved'
  | 'board_approved'
  | 'board_rejected'
  | 'club_approved'
  | 'club_rejected';

export interface AppNotification {
  id: number;
  clubId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPrefs {
  announcements: boolean;
  events: boolean;
  files: boolean;
  notes: boolean;
  reminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  announcements: true,
  events: true,
  files: true,
  notes: true,
  reminders: true,
};

/** A club membership as seen from the signed-in user's side. */
export interface Membership {
  clubId: string;
  role: ClubMemberRole;
  status: MembershipStatus;
  boardStatus: ApprovalStatus | null;
  position: string | null;
}

/** A roster row as seen by a club's managers. */
export interface ClubMemberRow {
  userId: string;
  email: string;
  displayName: string | null;
  role: ClubMemberRole;
  status: MembershipStatus;
  boardStatus: ApprovalStatus | null;
  position: string | null;
  permissions: ClubPermission[];
  boardMessage: string | null;
  joinedAt: string | null;
}

/** What the signed-in user may do inside one club, as decided by the database. */
export interface ClubAccess {
  isMember: boolean;
  canAdmin: boolean;
  membershipStatus: MembershipStatus | null;
  memberRole: ClubMemberRole | null;
  boardStatus: ApprovalStatus | null;
  position: string | null;
  permissions: ClubPermission[];
}

export const NO_ACCESS: ClubAccess = {
  isMember: false,
  canAdmin: false,
  membershipStatus: null,
  memberRole: null,
  boardStatus: null,
  position: null,
  permissions: [],
};

/**
 * Optional fields are the ones the backend has no column for yet. They are
 * omitted rather than invented; the UI hides the corresponding row instead of
 * showing a made-up officer list or founding year.
 */
export interface Club {
  id: string;
  name: string;
  advisor: string;
  location: string;
  day: string;
  time: string;
  category: ClubCategory;
  description: string;
  foundingYear?: number;
  memberCount: number;
  contactEmail: string;
  instagram?: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  joinPolicy: 'open' | 'approval';
  presidentId?: string | null;
  officers: Officer[];
  announcements: Announcement[];
}

export const CATEGORIES: ClubCategory[] = [
  'STEM',
  'Academic',
  'Arts',
  'Service',
  'Business',
  'Wellness',
  'Culture',
  'Sports',
];

export const EVENT_TYPES = [
  'Meeting',
  'Competition',
  'Conference',
  'Workshop',
  'Deadline',
  'Social',
] as const;

/** All category colors stay within the Tesla STEM green / blue brand palette. */
export function categoryColor(category: ClubCategory): { bg: string; text: string } {
  switch (category) {
    case 'STEM':
    case 'Service':
    case 'Wellness':
    case 'Sports':
      return { bg: 'bg-python-green', text: 'text-white' };
    case 'Academic':
    case 'Business':
    case 'Arts':
    case 'Culture':
    default:
      return { bg: 'bg-python-blue', text: 'text-white' };
  }
}

export function clubInitials(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Human label for a membership role, used by the role badges. */
export function roleLabel(role: ClubMemberRole, position?: string | null): string {
  if (role === 'president') return position?.trim() || 'President';
  if (role === 'board') return position?.trim() || 'Board Member';
  return 'Member';
}
