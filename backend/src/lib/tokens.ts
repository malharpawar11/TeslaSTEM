import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role } from '@prisma/client';
import { env } from '@/config/env';

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshKey = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface AccessClaims extends JWTPayload {
  sub: string;
  role: Role;
  email: string;
  tv: number; // tokenVersion
}

export async function signAccessToken(claims: Omit<AccessClaims, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TTL_SECONDS}s`)
    .sign(accessKey);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessKey, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ['HS256'],
  });
  return payload as AccessClaims;
}

// Refresh tokens are opaque (NOT JWTs) so they can be revoked at any time.
// We store only the SHA-256 hash. Random part is 32 bytes (256 bits).
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = sha256(raw);
  return { raw, hash };
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// Optional second factor we sign on top of the opaque value so anyone with DB
// read access cannot mint tokens. The JWT carries (jti, sub) and is verified
// against the stored hash on refresh.
export async function signRefreshEnvelope(jti: string, sub: string): Promise<string> {
  return new SignJWT({ sub, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(`${env.JWT_AUDIENCE}-refresh`)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_REFRESH_TTL_SECONDS}s`)
    .sign(refreshKey);
}

export async function verifyRefreshEnvelope(token: string): Promise<{ jti: string; sub: string }> {
  const { payload } = await jwtVerify(token, refreshKey, {
    issuer: env.JWT_ISSUER,
    audience: `${env.JWT_AUDIENCE}-refresh`,
    algorithms: ['HS256'],
  });
  const { jti, sub } = payload;
  if (typeof jti !== 'string' || typeof sub !== 'string') throw new Error('invalid refresh envelope');
  return { jti, sub };
}
