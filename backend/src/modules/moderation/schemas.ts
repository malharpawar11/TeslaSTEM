import { z } from 'zod';
import { paginationQuerySchema } from '@/utils/pagination';

export const createReportSchema = z.object({
  targetType: z.enum(['CLUB', 'ANNOUNCEMENT', 'USER']),
  targetId: z.string().min(1).max(64),
  reason: z.string().trim().min(2).max(120),
  details: z.string().trim().max(2000).optional(),
});

export const listReportsQuery = paginationQuerySchema.extend({
  status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).optional(),
});

export const updateReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  resolution: z.string().trim().max(2000).optional(),
});

export const reportIdParam = z.object({ id: z.string().min(1).max(64) });
