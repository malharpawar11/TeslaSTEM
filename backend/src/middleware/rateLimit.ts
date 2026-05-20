import rateLimit, { type Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import type { Request } from 'express';
import { redis } from '@/lib/redis';
import { RATE_LIMITS } from '@/config/constants';

// Use redis so limits are shared across replicas. Each call returns a fresh
// middleware bound to its own prefix so counters do not bleed across routes.
function makeLimiter(
  prefix: string,
  windowMs: number,
  max: number,
  keyFn: (req: Request) => string,
  opts: Partial<Options> = {},
) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyFn,
    store: new RedisStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: ((...args: string[]) => redis.call(...(args as [string, ...string[]]))) as any,
      prefix: `rl:${prefix}:`,
    }),
    ...opts,
  });
}

const ipKey = (req: Request) => req.ip ?? 'unknown';
const userOrIpKey = (req: Request) => req.auth?.id ?? req.ip ?? 'unknown';

// All traffic. First line of defence against floods.
export const globalLimiter = makeLimiter(
  'global',
  RATE_LIMITS.global.windowMs,
  RATE_LIMITS.global.max,
  ipKey,
);

// Auth endpoints — tighter, scoped by IP+email body to slow credential stuffing.
export const authLimiter = makeLimiter(
  'auth',
  RATE_LIMITS.auth.windowMs,
  RATE_LIMITS.auth.max,
  (req) => {
    const email =
      typeof req.body === 'object' && req.body && typeof (req.body as { email?: unknown }).email === 'string'
        ? ((req.body as { email: string }).email || '').toLowerCase()
        : '';
    return `${req.ip ?? 'unknown'}|${email}`;
  },
);

// Mutating actions for authenticated users.
export const writeLimiter = makeLimiter(
  'write',
  RATE_LIMITS.write.windowMs,
  RATE_LIMITS.write.max,
  userOrIpKey,
);

// Announcement / push triggers — very tight to prevent broadcast spam.
export const pushLimiter = makeLimiter(
  'push',
  RATE_LIMITS.push.windowMs,
  RATE_LIMITS.push.max,
  userOrIpKey,
);
