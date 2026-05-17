import { Router } from 'express';
import { requireAuth } from '@/middleware/authn';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { writeLimiter } from '@/middleware/rateLimit';
import { create, list, update } from './controller';
import {
  createReportSchema,
  listReportsQuery,
  reportIdParam,
  updateReportSchema,
} from './schemas';

export const reportsRouter = Router();

// Any authenticated user may file a report.
reportsRouter.post(
  '/reports',
  requireAuth,
  writeLimiter,
  validate({ body: createReportSchema }),
  create,
);

reportsRouter.get(
  '/admin/reports',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ query: listReportsQuery }),
  list,
);

reportsRouter.patch(
  '/admin/reports/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ params: reportIdParam, body: updateReportSchema }),
  update,
);
