import { Role } from '@/types/domain';
export function canManageClub(role: Role, clubId: string, adminClubIds: string[]) { return role === 'super_admin' || (role === 'club_admin' && adminClubIds.includes(clubId)); }
export function sanitizeText(input: string) { return input.replace(/[<>]/g, '').trim().slice(0, 5000); }
