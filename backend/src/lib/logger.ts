import pino from 'pino';
import { env, isProd } from '@/config/env';

// Fields that must never appear in logs.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.newPassword',
  'req.body.currentPassword',
  'req.body.token',
  'req.body.refreshToken',
  'res.headers["set-cookie"]',
  '*.passwordHash',
  '*.tokenHash',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'clubhub-api', env: env.NODE_ENV },
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  // Pretty output in dev only; JSON in prod for log shippers.
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
      },
});
