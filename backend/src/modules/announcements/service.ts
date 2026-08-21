import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { forbidden, notFound } from '@/utils/errors';
import { sanitizeText } from '@/utils/sanitize';
import { sendExpoPush } from '@/lib/push';

const announcementSelect = {
  id: true,
  clubId: true,
  authorId: true,
  title: true,
  body: true,
  schoolWide: true,
  createdAt: true,
} as const;

export async function createAnnouncement(
  authorId: string,
  authorRole: Role,
  clubId: string,
  input: { title: string; body: string; schoolWide?: boolean },
) {
  const club = await prisma.club.findFirst({
    where: { id: clubId, deletedAt: null, isApproved: true },
    select: { id: true, name: true },
  });
  if (!club) throw notFound('Club not found');

  // Only super admins can broadcast school-wide; club admins are scoped to followers.
  const schoolWide = Boolean(input.schoolWide && authorRole === 'SUPER_ADMIN');

  const announcement = await prisma.announcement.create({
    data: {
      clubId,
      authorId,
      title: sanitizeText(input.title, 200),
      body: sanitizeText(input.body, 4000),
      schoolWide,
    },
    select: announcementSelect,
  });

  // Fire push notifications asynchronously: do not block the HTTP response on it.
  void dispatchAnnouncementPush(announcement.id, club.name, announcement.title, schoolWide ? null : clubId);

  return announcement;
}

async function dispatchAnnouncementPush(
  announcementId: string,
  clubName: string,
  title: string,
  scopeClubId: string | null,
): Promise<void> {
  // Audience selection:
  //   - schoolWide announcement -> every active user
  //   - club announcement -> users who follow (or are members of) the club
  const audienceWhere: Prisma.UserWhereInput = scopeClubId
    ? { status: 'ACTIVE', memberships: { some: { clubId: scopeClubId } } }
    : { status: 'ACTIVE' };

  const users = await prisma.user.findMany({
    where: audienceWhere,
    select: { id: true, devices: { select: { expoPushToken: true } } },
  });

  const tokens = users.flatMap((u) => u.devices.map((d) => d.expoPushToken));

  // Record deliveries so the client can show unread state and we can audit reach.
  if (users.length) {
    await prisma.announcementDelivery.createMany({
      data: users.map((u) => ({ announcementId, userId: u.id })),
      skipDuplicates: true,
    });
  }

  if (tokens.length) {
    await sendExpoPush({
      to: tokens,
      title: clubName,
      body: title,
      data: { type: 'announcement', announcementId, clubId: scopeClubId ?? undefined },
    });
  }
}

export async function listClubAnnouncements(clubId: string, args: { limit: number; cursor?: string }) {
  const club = await prisma.club.findFirst({
    where: { id: clubId, deletedAt: null, isApproved: true },
    select: { id: true },
  });
  if (!club) throw notFound('Club not found');

  return prisma.announcement.findMany({
    where: { clubId, deletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: announcementSelect,
  });
}

export async function myAnnouncementFeed(userId: string, args: { limit: number; cursor?: string }) {
  return prisma.announcement.findMany({
    where: {
      deletedAt: null,
      OR: [
        { schoolWide: true },
        { club: { memberships: { some: { userId } }, isApproved: true, deletedAt: null } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: {
      ...announcementSelect,
      club: { select: { id: true, name: true, slug: true, imageUrl: true } },
    },
  });
}

export async function deleteAnnouncement(
  actorId: string,
  actorRole: Role,
  announcementId: string,
): Promise<void> {
  const a = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { id: true, authorId: true, clubId: true, deletedAt: true },
  });
  if (!a || a.deletedAt) throw notFound('Announcement not found');

  if (actorRole !== 'SUPER_ADMIN' && a.authorId !== actorId) {
    // Allow club admins of the announcement's club to delete too.
    const admin = await prisma.clubAdminAssignment.findUnique({
      where: { clubId_userId: { clubId: a.clubId, userId: actorId } },
      select: { clubId: true },
    });
    if (!admin) throw forbidden('Not allowed to delete this announcement');
  }

  await prisma.announcement.update({ where: { id: announcementId }, data: { deletedAt: new Date() } });
}

export async function markAnnouncementRead(userId: string, announcementId: string): Promise<void> {
  await prisma.announcementDelivery.updateMany({
    where: { announcementId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}
