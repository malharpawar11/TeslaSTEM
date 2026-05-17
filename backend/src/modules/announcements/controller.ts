import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/errors';
import { auditFromReq } from '@/lib/audit';
import { buildCursorPage } from '@/utils/pagination';
import {
  createAnnouncement,
  deleteAnnouncement,
  listClubAnnouncements,
  markAnnouncementRead,
  myAnnouncementFeed,
} from './service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId } = req.params as { clubId: string };
  const announcement = await createAnnouncement(
    req.auth.id,
    req.auth.role,
    clubId,
    req.body as never,
  );
  await auditFromReq(req, {
    action: 'ANNOUNCEMENT_CREATE',
    entityType: 'Announcement',
    entityId: announcement.id,
    metadata: { clubId },
  });
  res.status(201).json(announcement);
});

export const listForClub = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params as { clubId: string };
  const q = req.query as { limit: number; cursor?: string };
  const rows = await listClubAnnouncements(clubId, q);
  res.json(buildCursorPage(rows, q.limit));
});

export const myFeed = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const q = req.query as { limit: number; cursor?: string };
  const rows = await myAnnouncementFeed(req.auth.id, q);
  res.json(buildCursorPage(rows, q.limit));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { id } = req.params as { id: string };
  await deleteAnnouncement(req.auth.id, req.auth.role, id);
  await auditFromReq(req, { action: 'ANNOUNCEMENT_DELETE', entityType: 'Announcement', entityId: id });
  res.status(204).end();
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { id } = req.params as { id: string };
  await markAnnouncementRead(req.auth.id, id);
  res.status(204).end();
});
