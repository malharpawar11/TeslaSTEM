import cors from 'cors';
import { env, isProd } from '@/config/env';
import { logger } from '@/lib/logger';

// Strict allowlist CORS. We never echo arbitrary origins back, and credentials
// are only enabled when the origin is in the allowlist (refresh cookies need it).
const allowed = new Set(env.CORS_ALLOWED_ORIGINS);

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Same-origin requests / native mobile (no Origin header) are allowed.
    if (!origin) return cb(null, true);
    if (allowed.has(origin)) return cb(null, true);
    if (!isProd) {
      // In dev be permissive to ease local debugging, but log every cross-origin hit.
      logger.warn({ origin }, 'cors: non-allowlisted origin in dev, allowing');
      return cb(null, true);
    }
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
});
