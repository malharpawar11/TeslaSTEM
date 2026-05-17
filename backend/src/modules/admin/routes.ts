import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/middleware/authn';
import { requireRole } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { paginationQuerySchema } from '@/utils/pagination';
import { listAuditLogs } from './controller';

export const adminRouter = Router();

const auditQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().min(1).max(60).optional(),
  actorId: z.string().min(1).max(64).optional(),
});

adminRouter.get(
  '/audit-logs',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ query: auditQuerySchema }),
  listAuditLogs,
);
