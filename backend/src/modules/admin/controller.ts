import type { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { asyncHandler } from '@/utils/asyncHandler';

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { limit: number; cursor?: string; action?: string; actorId?: string };

  // Cursor is the stringified bigint id of the previous page's last row.
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(q.action ? { action: q.action } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
    },
    orderBy: { id: 'desc' },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: BigInt(q.cursor) }, skip: 1 } : {}),
  });

  const hasMore = rows.length > q.limit;
  const items = (hasMore ? rows.slice(0, q.limit) : rows).map((r) => ({
    ...r,
    // BigInt is not JSON-safe; convert to string for the wire.
    id: r.id.toString(),
  }));
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
  res.json({ items, nextCursor });
});
