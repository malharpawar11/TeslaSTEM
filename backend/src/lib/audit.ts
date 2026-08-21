import type { Request } from 'express';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

// Fire-and-log: an audit write failure must never block the user's action,
// but is loud in logs so we can investigate.
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? {}) as object,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, audit: input }, 'audit log write failed');
  }
}

// Convenience for routes: pulls actor + ip + UA from the request.
export function auditFromReq(
  req: Request,
  partial: Omit<AuditInput, 'actorId' | 'ip' | 'userAgent'>,
): Promise<void> {
  return writeAudit({
    ...partial,
    actorId: req.auth?.id ?? null,
    ip: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
  });
}
