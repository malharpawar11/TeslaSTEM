import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from '@/config/env';
import { API_PREFIX, SECURITY } from '@/config/constants';
import { logger } from '@/lib/logger';
import { requestId } from '@/middleware/requestId';
import { corsMiddleware } from '@/middleware/cors';
import { globalLimiter } from '@/middleware/rateLimit';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { apiRouter } from '@/routes';

export function buildApp() {
  const app = express();

  // Behind a proxy (LB / Cloud Run). Trust exactly TRUST_PROXY_HOPS hops so we
  // can read req.ip and rate limit accurately without IP spoofing.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');
  app.set('etag', false); // we don't rely on conditional GET; saves CPU

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.id, userId: (req as never as { auth?: { id: string } }).auth?.id }),
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // Security headers (CSP intentionally minimal: this is a JSON API).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(corsMiddleware);
  app.use(express.json({ limit: SECURITY.maxBodyBytes }));
  app.use(express.urlencoded({ extended: false, limit: SECURITY.maxBodyBytes }));
  app.use(cookieParser());

  // Global rate limit BEFORE routes.
  app.use(globalLimiter);

  app.use(API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
