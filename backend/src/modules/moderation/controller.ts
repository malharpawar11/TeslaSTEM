import type { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { asyncHandler } from '@/utils/asyncHandler';
import { notFound, unauthorized } from '@/utils/errors';
import { auditFromReq } from '@/lib/audit';
import { buildCursorPage } from '@/utils/pagination';

const reportSelect = {
  id: true,
  reporterId: true,
  targetType: true,
  targetId: true,
  reason: true,
  details: true,
  status: true,
  resolvedById: true,
  resolvedAt: true,
  resolution: true,
  createdAt: true,
} as const;

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const body = req.body as {
    targetType: 'CLUB' | 'ANNOUNCEMENT' | 'USER';
    targetId: string;
    reason: string;
    details?: string;
  };
  const report = await prisma.report.create({
    data: {
      reporterId: req.auth.id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      details: body.details ?? null,
    },
    select: reportSelect,
  });
  await auditFromReq(req, {
    action: 'REPORT_CREATE',
    entityType: 'Report',
    entityId: report.id,
    metadata: { targetType: body.targetType, targetId: body.targetId },
  });
  res.status(201).json(report);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { limit: number; cursor?: string; status?: 'OPEN' | 'RESOLVED' | 'DISMISSED' };
  const rows = await prisma.report.findMany({
    where: q.status ? { status: q.status } : undefined,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    select: reportSelect,
  });
  res.json(buildCursorPage(rows, q.limit));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw unauthorized();
  const { id } = req.params as { id: string };
  const body = req.body as { status: 'RESOLVED' | 'DISMISSED'; resolution?: string };

  const existing = await prisma.report.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Report not found');

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: body.status,
      resolution: body.resolution ?? null,
      resolvedById: req.auth.id,
      resolvedAt: new Date(),
    },
    select: reportSelect,
  });

  await auditFromReq(req, {
    action: `REPORT_${body.status}`,
    entityType: 'Report',
    entityId: id,
    metadata: { resolution: body.resolution },
  });

  res.json(updated);
});
