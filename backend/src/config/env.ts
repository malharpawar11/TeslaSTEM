import 'dotenv/config';
import { z } from 'zod';

const csv = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
  JWT_ISSUER: z.string().min(1).default('clubhub'),
  JWT_AUDIENCE: z.string().min(1).default('clubhub-mobile'),

  SCHOOL_EMAIL_DOMAINS: z
    .string()
    .min(1)
    .transform((s) => csv(s).map((d) => d.toLowerCase())),

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  MICROSOFT_OAUTH_CLIENT_ID: z.string().optional().default(''),
  MICROSOFT_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  MICROSOFT_OAUTH_TENANT: z.string().optional().default('common'),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((s) => csv(s)),

  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),

  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),

  BOOTSTRAP_SUPER_ADMIN_EMAIL: z.string().email().optional().or(z.literal('')).default(''),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Surface configuration errors loudly and stop the process: do not run with bad config.
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
