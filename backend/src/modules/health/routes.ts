import { Router } from 'express';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const healthRouter = Router();

// Liveness — process is up. Used by Kubernetes/Cloud Run liveness probes.
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Readiness — dependencies are reachable. Used by load balancer probes.
healthRouter.get('/ready', async (_req, res) => {
  const result: Record<string, 'ok' | 'down'> = { db: 'down', redis: 'down' };
  try {
    await prisma.$queryRaw`select 1`;
    result.db = 'ok';
  } catch {
    /* leave as down */
  }
  try {
    await redis.ping();
    result.redis = 'ok';
  } catch {
    /* leave as down */
  }
  const allUp = Object.values(result).every((v) => v === 'ok');
  res.status(allUp ? 200 : 503).json(result);
});
