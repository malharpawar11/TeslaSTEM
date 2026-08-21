import argon2 from 'argon2';
import { env } from '@/config/env';

// Argon2id is the OWASP-recommended password KDF as of 2024. We configure costs
// from env so we can raise them over time without code changes.
const options: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: env.ARGON2_MEMORY_COST,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, options);
}

// Always run a verify call, even on lookup miss, using this dummy hash, to
// avoid leaking user existence via timing on the login endpoint.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYWx0$2c+J1wkfHFiYg0/8/Ck5l3o/qNcCmuOZ/yp1u9zZWJk';

export async function verifyPassword(hash: string | null | undefined, plain: string): Promise<boolean> {
  const target = hash ?? DUMMY_HASH;
  try {
    const ok = await argon2.verify(target, plain);
    return hash ? ok : false;
  } catch {
    return false;
  }
}
