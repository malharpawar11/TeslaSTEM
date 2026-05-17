import { Router } from 'express';
import { optionalAuth, requireAuth } from '@/middleware/authn';
import { requireClubAdmin, requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { writeLimiter } from '@/middleware/rateLimit';
import { paginationQuerySchema } from '@/utils/pagination';
import {
  addAdmin,
  approve,
  create,
  dropAdmin,
  follow,
  getOne,
  list,
  members,
  remove,
  unfollow,
  update,
} from './controller';
import {
  approveClubSchema,
  assignAdminSchema,
  clubIdParamSchema,
  createClubSchema,
  listClubsQuerySchema,
  removeAdminParamSchema,
  updateClubSchema,
} from './schemas';

export const clubsRouter = Router();

// Public-ish browsing — optionalAuth so we can show approval state to super admins.
clubsRouter.get('/', optionalAuth, validate({ query: listClubsQuerySchema }), list);
clubsRouter.get('/:clubId', optionalAuth, validate({ params: clubIdParamSchema }), getOne);

// Create — any authenticated user may propose a club; super admin auto-approves.
clubsRouter.post(
  '/',
  requireAuth,
  writeLimiter,
  validate({ body: createClubSchema }),
  create,
);

clubsRouter.patch(
  '/:clubId',
  requireAuth,
  writeLimiter,
  validate({ params: clubIdParamSchema, body: updateClubSchema }),
  requireClubAdmin('clubId'),
  update,
);

clubsRouter.delete(
  '/:clubId',
  requireAuth,
  validate({ params: clubIdParamSchema }),
  requireRole('SUPER_ADMIN'),
  remove,
);

clubsRouter.post(
  '/:clubId/follow',
  requireAuth,
  writeLimiter,
  validate({ params: clubIdParamSchema }),
  follow,
);

clubsRouter.delete(
  '/:clubId/follow',
  requireAuth,
  validate({ params: clubIdParamSchema }),
  unfollow,
);

// Member listing — only admins of the club (or super admins).
clubsRouter.get(
  '/:clubId/members',
  requireAuth,
  validate({ params: clubIdParamSchema, query: paginationQuerySchema }),
  requireClubAdmin('clubId'),
  members,
);

// Admin assignment — super-admin only.
clubsRouter.post(
  '/:clubId/admins',
  requireAuth,
  writeLimiter,
  validate({ params: clubIdParamSchema, body: assignAdminSchema }),
  requireRole('SUPER_ADMIN'),
  addAdmin,
);

clubsRouter.delete(
  '/:clubId/admins/:userId',
  requireAuth,
  validate({ params: removeAdminParamSchema }),
  requireRole('SUPER_ADMIN'),
  dropAdmin,
);

clubsRouter.post(
  '/:clubId/approve',
  requireAuth,
  validate({ params: clubIdParamSchema, body: approveClubSchema }),
  requireRole('SUPER_ADMIN'),
  approve,
);
