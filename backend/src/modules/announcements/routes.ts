import { Router } from 'express';
import { requireAuth } from '@/middleware/authn';
import { requireClubAdmin } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { pushLimiter, writeLimiter } from '@/middleware/rateLimit';
import {
  announcementIdParam,
  clubIdParam,
  createAnnouncementSchema,
  listClubAnnouncementsQuery,
  myFeedQuery,
} from './schemas';
import { create, listForClub, markRead, myFeed, remove } from './controller';

// Two routers since announcements live under both /clubs/:clubId and /me + /announcements.
export const clubAnnouncementsRouter = Router({ mergeParams: true });

clubAnnouncementsRouter.get(
  '/',
  requireAuth,
  validate({ params: clubIdParam, query: listClubAnnouncementsQuery }),
  listForClub,
);

clubAnnouncementsRouter.post(
  '/',
  requireAuth,
  pushLimiter,
  writeLimiter,
  validate({ params: clubIdParam, body: createAnnouncementSchema }),
  requireClubAdmin('clubId'),
  create,
);

export const announcementsRouter = Router();

announcementsRouter.get(
  '/me/feed',
  requireAuth,
  validate({ query: myFeedQuery }),
  myFeed,
);

announcementsRouter.post(
  '/announcements/:id/read',
  requireAuth,
  validate({ params: announcementIdParam }),
  markRead,
);

announcementsRouter.delete(
  '/announcements/:id',
  requireAuth,
  validate({ params: announcementIdParam }),
  remove,
);
