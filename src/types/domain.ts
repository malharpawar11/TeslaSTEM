export type ClubCategory =
  | 'STEM'
  | 'Arts'
  | 'Service'
  | 'Sports'
  | 'Culture'
  | 'Academic'
  | 'Business'
  | 'Wellness';

/** Lifecycle shared by club approval and president verification (see 003 migration). */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** The four roles defined in supabase/migrations/003. Mirrors the DB enum. */
export type AppRole = 'special_admin' | 'verified_president' | 'club_admin' | 'student';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
}

export interface Officer {
  role: 'President' | 'Vice President' | 'Secretary' | 'Treasurer';
  name: string;
}

export interface Club {
  id: string;
  name: string;
  advisor: string;
  location: string;
  day: string;
  time: string;
  category: ClubCategory;
  description: string;
  foundingYear: number;
  memberCount: number;
  followersCount: number;
  contactEmail: string;
  instagram: string;
  website: string;
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
