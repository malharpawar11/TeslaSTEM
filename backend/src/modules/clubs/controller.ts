import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/errors';
import { auditFromReq } from '@/lib/audit';
import { buildCursorPage } from '@/utils/pagination';
import {
  assignAdmin,
  createClub,
  deleteClub,
  followClub,
  getClubById,
  listClubMembers,
  listClubs,
  removeAdmin,
  setClubApproval,
  unfollowClub,
  updateClub,
} from './service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as { limit: number; cursor?: string; q?: string; category?: string; approved?: boolean };
  const rows = await listClubs({
    limit: q.limit,
    cursor: q.cursor,
    q: q.q,
    category: q.category,
    approved: q.approved,
    actorRole: req.auth?.role,
  });
  res.json(buildCursorPage(rows, q.limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params as { clubId: string };
  const club = await getClubById(clubId, req.auth?.role);
  res.json(club);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const club = await createClub(req.auth.id, req.auth.role, req.body as never);
  await auditFromReq(req, { action: 'CLUB_CREATE', entityType: 'Club', entityId: club.id });
  res.status(201).json(club);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId } = req.params as { clubId: string };
  const club = await updateClub(clubId, req.body as never);
  await auditFromReq(req, { action: 'CLUB_UPDATE', entityType: 'Club', entityId: clubId });
  res.json(club);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId } = req.params as { clubId: string };
  await deleteClub(clubId);
  await auditFromReq(req, { action: 'CLUB_DELETE', entityType: 'Club', entityId: clubId });
  res.status(204).end();
});

export const follow = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId } = req.params as { clubId: string };
  await followClub(req.auth.id, clubId);
  res.status(204).end();
});

export const unfollow = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId } = req.params as { clubId: string };
  await unfollowClub(req.auth.id, clubId);
  res.status(204).end();
});

export const addAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId } = req.params as { clubId: string };
  const { userId } = req.body as { userId: string };
  await assignAdmin(req.auth.id, clubId, userId);
  await auditFromReq(req, {
    action: 'CLUB_ADMIN_ADD',
    entityType: 'Club',
    entityId: clubId,
    metadata: { userId },
  });
  res.status(204).end();
});

export const dropAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId, userId } = req.params as { clubId: string; userId: string };
  await removeAdmin(clubId, userId);
  await auditFromReq(req, {
    action: 'CLUB_ADMIN_REMOVE',
    entityType: 'Club',
    entityId: clubId,
    metadata: { userId },
  });
  res.status(204).end();
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { clubId } = req.params as { clubId: string };
  const { approved } = req.body as { approved: boolean };
  const club = await setClubApproval(req.auth.id, clubId, approved);
  await auditFromReq(req, {
    action: approved ? 'CLUB_APPROVE' : 'CLUB_UNAPPROVE',
    entityType: 'Club',
    entityId: clubId,
  });
  res.json(club);
});

export const members = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params as { clubId: string };
  const q = req.query as { limit: number; cursor?: string };
  const rows = await listClubMembers(clubId, { limit: q.limit, cursor: q.cursor });
  // cursor is the userId of the last item since composite key includes (clubId, userId)
  const hasMore = rows.length > q.limit;
  const items = hasMore ? rows.slice(0, q.limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.user.id ?? null : null;
  res.json({ items, nextCursor });
});
