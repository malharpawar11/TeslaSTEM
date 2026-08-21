import { PrismaClient } from '@prisma/client';
import { isProd } from '@/config/env';
import { logger } from '@/lib/logger';

// Single PrismaClient instance shared across the app: Prisma connection pool handles concurrency.
export const prisma = new PrismaClient({
  log: isProd
    ? [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }]
    : [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
});

prisma.$on('warn', (e) => logger.warn({ prisma: e }, 'prisma warning'));
prisma.$on('error', (e) => logger.error({ prisma: e }, 'prisma error'));

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
