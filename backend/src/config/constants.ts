export const API_PREFIX = '/api/v1';

export const REFRESH_COOKIE_NAME = 'chub_rt';

export const RATE_LIMITS = {
  global: { windowMs: 60_000, max: 100 },
  auth: { windowMs: 60_000, max: 10 },
  write: { windowMs: 60_000, max: 30 },
  push: { windowMs: 60_000, max: 5 },
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const SECURITY = {
  maxBodyBytes: 256 * 1024, // 256 KB; raise on file upload routes if added
  passwordMinLength: 12,
  passwordMaxLength: 128,
} as const;
