import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  // Lazy connect so the process doesn't crash at import when Redis is unavailable
  // in development. The rate limiter fails open when Redis is unreachable.
  lazyConnect: true,
});

redis.on('error', (err) => logger.error({ err }, 'redis error'));
redis.on('connect', () => logger.info('redis connected'));

export async function disconnectRedis() {
  await redis.quit();
}
