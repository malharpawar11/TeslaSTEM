import { buildApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { disconnectPrisma, prisma } from '@/lib/prisma';
import { disconnectRedis, redis } from '@/lib/redis';

async function preflight(): Promise<void> {
  // Fail loudly at boot if dependencies are not reachable. This keeps a
  // misconfigured replica from serving traffic.
  await prisma.$queryRaw`select 1`;

  try {
    await redis.ping();
  } catch (err) {
    if (env.NODE_ENV === 'production') throw err;
    // In development, Redis is optional — rate limiting fails open without it.
    logger.warn({ err }, 'redis unavailable — rate-limiting disabled');
  }

  // Optional: seed a super admin on first boot from env.
  if (env.BOOTSTRAP_SUPER_ADMIN_EMAIL) {
    const email = env.BOOTSTRAP_SUPER_ADMIN_EMAIL.toLowerCase();
    const existingSuper = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE' } });
    if (!existingSuper) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (u) {
        await prisma.user.update({ where: { id: u.id }, data: { role: 'SUPER_ADMIN' } });
        logger.warn({ email }, 'bootstrapped existing user to SUPER_ADMIN');
      } else {
        // Pre-create a stub — they will set a password / OAuth-link later.
        await prisma.user.create({
          data: {
            email,
            displayName: 'Super Admin',
            role: 'SUPER_ADMIN',
            emailVerifiedAt: new Date(),
          },
        });
        logger.warn({ email }, 'bootstrapped SUPER_ADMIN account (password unset — sign in via OAuth)');
      }
    }
  }
}

async function main(): Promise<void> {
  await preflight();
  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'clubhub api listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutdown initiated');
    // Stop accepting new connections.
    server.close(async () => {
      try {
        await disconnectPrisma();
        await disconnectRedis();
        logger.info('shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'shutdown error');
        process.exit(1);
      }
    });
    // Hard timeout — never hang forever.
    setTimeout(() => {
      logger.error('forced shutdown after timeout');
      process.exit(1);
    }, 15_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception — exiting');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'server failed to start');
  process.exit(1);
});
