import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { conflict, forbidden, notFound } from '@/utils/errors';
import { toSlug } from '@/utils/sanitize';

interface ListClubsArgs {
  limit: number;
  cursor?: string;
  q?: string;
  category?: string;
  approved?: boolean;
  actorRole?: Role;
}

const publicClubSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  description: true,
  meetingDay: true,
  meetingTime: true,
  location: true,
  advisor: true,
  contactEmail: true,
  imageUrl: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { memberships: true, announcements: true } },
} as const;

export async function listClubs(args: ListClubsArgs) {
  const where: Prisma.ClubWhereInput = { deletedAt: null };

  // Approval filter: students only see approved clubs.
  if (args.actorRole === 'SUPER_ADMIN' && typeof args.approved === 'boolean') {
    where.isApproved = args.approved;
  } else {
    where.isApproved = true;
  }

  if (args.category) where.category = { equals: args.category, mode: 'insensitive' };
  if (args.q) {
    where.OR = [
      { name: { contains: args.q, mode: 'insensitive' } },
      { description: { contains: args.q, mode: 'insensitive' } },
      { category: { contains: args.q, mode: 'insensitive' } },
      { advisor: { contains: args.q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.club.findMany({
    where,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: publicClubSelect,
  });

  return rows;
}

export async function getClubById(clubId: string, actorRole?: Role) {
  const club = await prisma.club.findFirst({
    where: { id: clubId, deletedAt: null },
    select: publicClubSelect,
  });
  if (!club) throw notFound('Club not found');
  if (!club.isApproved && actorRole !== 'SUPER_ADMIN') throw notFound('Club not found');
  return club;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = toSlug(base) || 'club';
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const exists = await prisma.club.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    n += 1;
    if (n > 200) throw conflict('Could not allocate club slug');
  }
}

export async function createClub(actorId: string, actorRole: Role, input: {
  name: string;
  category: string;
  description: string;
  meetingDay?: string;
  meetingTime?: string;
  location?: string;
  advisor?: string;
  contactEmail?: string;
  imageUrl?: string;
}) {
  const slug = await uniqueSlug(input.name);
  // Auto-approve when a super admin creates the club; otherwise it enters
  // pending review.
  const isApproved = actorRole === 'SUPER_ADMIN';
  const club = await prisma.club.create({
    data: {
      ...input,
      slug,
      isApproved,
      approvedAt: isApproved ? new Date() : null,
      approvedById: isApproved ? actorId : null,
      createdById: actorId,
    },
    select: publicClubSelect,
  });
  return club;
}

export async function updateClub(clubId: string, input: Prisma.ClubUpdateInput) {
  return prisma.club.update({ where: { id: clubId }, data: input, select: publicClubSelect });
}

export async function deleteClub(clubId: string) {
  // Soft delete to preserve audit / announcement history.
  await prisma.club.update({
    where: { id: clubId },
    data: { deletedAt: new Date(), isApproved: false },
  });
}

export async function followClub(userId: string, clubId: string) {
  const club = await prisma.club.findFirst({
    where: { id: clubId, deletedAt: null, isApproved: true },
    select: { id: true },
  });
  if (!club) throw notFound('Club not found');
  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId, userId } },
    update: {},
    create: { clubId, userId, type: 'FOLLOWER' },
  });
}

export async function unfollowClub(userId: string, clubId: string) {
  await prisma.clubMembership.deleteMany({ where: { clubId, userId } });
}

export async function assignAdmin(actorId: string, clubId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  if (!user || user.status !== 'ACTIVE') throw notFound('User not found');

  await prisma.$transaction([
    prisma.clubAdminAssignment.upsert({
      where: { clubId_userId: { clubId, userId } },
      update: { assignedById: actorId },
      create: { clubId, userId, assignedById: actorId },
    }),
    // promote to CLUB_ADMIN if currently a plain student
    user.role === 'STUDENT'
      ? prisma.user.update({ where: { id: userId }, data: { role: 'CLUB_ADMIN' } })
      : prisma.user.update({ where: { id: userId }, data: {} }),
  ]);
}

export async function removeAdmin(clubId: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.clubAdminAssignment.deleteMany({ where: { clubId, userId } });
    const remaining = await tx.clubAdminAssignment.count({ where: { userId } });
    if (remaining === 0) {
      // demote back to STUDENT if no more club admin assignments left and not super
      const u = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (u?.role === 'CLUB_ADMIN') {
        await tx.user.update({ where: { id: userId }, data: { role: 'STUDENT' } });
      }
    }
  });
}

export async function setClubApproval(actorId: string, clubId: string, approved: boolean) {
  return prisma.club.update({
    where: { id: clubId },
    data: {
      isApproved: approved,
      approvedAt: approved ? new Date() : null,
      approvedById: approved ? actorId : null,
    },
    select: publicClubSelect,
  });
}

export async function listClubMembers(clubId: string, args: { limit: number; cursor?: string }) {
  return prisma.clubMembership.findMany({
    where: { clubId },
    orderBy: [{ joinedAt: 'desc' }, { userId: 'asc' }],
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { clubId_userId: { clubId, userId: args.cursor } }, skip: 1 } : {}),
    select: {
      type: true,
      joinedAt: true,
      user: { select: { id: true, displayName: true, role: true } },
    },
  });
}

// Validate role of an actor against a club at the service layer too: defence
// in depth alongside the middleware guards.
export async function assertCanManageClub(actorId: string, actorRole: Role, clubId: string) {
  if (actorRole === 'SUPER_ADMIN') return;
  const a = await prisma.clubAdminAssignment.findUnique({
    where: { clubId_userId: { clubId, userId: actorId } },
    select: { clubId: true },
  });
  if (!a) throw forbidden('You are not an admin of this club');
}
