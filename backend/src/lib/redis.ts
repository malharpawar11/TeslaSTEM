import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

export const redis = new Redis(env.REDIS_URL, {
  // Fail fast if redis is unavailable — rate limits depend on it.
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => logger.error({ err }, 'redis error'));
redis.on('connect', () => logger.info('redis connected'));

export async function disconnectRedis() {
  await redis.quit();
}
