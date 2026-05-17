import type { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized, notFound } from '@/utils/errors';
import { auditFromReq } from '@/lib/audit';
import { sanitizeText } from '@/utils/sanitize';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      clubAdminAssignments: { select: { clubId: true } },
    },
  });
  if (!user) throw notFound('User not found');
  res.json({
    ...user,
    adminClubIds: user.clubAdminAssignments.map((a) => a.clubId),
    clubAdminAssignments: undefined,
  });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { displayName } = req.body as { displayName?: string };

  const data: { displayName?: string } = {};
  if (typeof displayName === 'string') data.displayName = sanitizeText(displayName, 80);

  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data,
    select: { id: true, email: true, displayName: true, role: true },
  });
  await auditFromReq(req, { action: 'USER_UPDATE_SELF', entityType: 'User', entityId: req.auth.id });
  res.json(user);
});

export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const body = req.body as { expoPushToken: string; platform: 'IOS' | 'ANDROID' | 'WEB'; appVersion?: string };

  // Upsert by unique expoPushToken so re-registration just moves the token to
  // the right user without creating duplicates.
  const device = await prisma.deviceToken.upsert({
    where: { expoPushToken: body.expoPushToken },
    update: {
      userId: req.auth.id,
      platform: body.platform,
      appVersion: body.appVersion ?? null,
      lastSeenAt: new Date(),
    },
    create: {
      userId: req.auth.id,
      expoPushToken: body.expoPushToken,
      platform: body.platform,
      appVersion: body.appVersion ?? null,
    },
    select: { id: true, platform: true, createdAt: true, lastSeenAt: true },
  });
  res.status(201).json(device);
});

export const unregisterDevice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { id } = req.params as { id: string };
  await prisma.deviceToken.deleteMany({ where: { id, userId: req.auth.id } });
  res.status(204).end();
});
