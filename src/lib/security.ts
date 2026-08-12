import { Role } from '@/types/domain';

/**
 * Client-side convenience only — the authoritative check is `can_admin_club()`
 * in Postgres, which RLS applies to every read and write.
 */
export function canManageClub(role: Role, clubId: string, adminClubIds: string[]) {
  return role === 'special_admin' || (role === 'club_admin' && adminClubIds.includes(clubId));
}

export function sanitizeText(input: string) {
  return input.replace(/[<>]/g, '').trim().slice(0, 5000);
}
