import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import type { OAuthProvider, Role, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
  generateRefreshToken,
  sha256,
  signAccessToken,
  signRefreshEnvelope,
  verifyRefreshEnvelope,
} from '@/lib/tokens';
import { env } from '@/config/env';
import { isSchoolEmail } from '@/utils/schoolDomain';
import { normalizeEmail, sanitizeText } from '@/utils/sanitize';
import { badRequest, conflict, forbidden, unauthorized } from '@/utils/errors';
import { writeAudit } from '@/lib/audit';

interface IssueOpts {
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResult {
  user: Pick<User, 'id' | 'email' | 'displayName' | 'role' | 'emailVerifiedAt'>;
  tokens: AuthTokens;
}

function publicUser(u: User): AuthResult['user'] {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    emailVerifiedAt: u.emailVerifiedAt,
  };
}

async function issueTokens(user: User, opts: IssueOpts, familyId?: string): Promise<AuthTokens> {
  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    tv: user.tokenVersion,
  });
  const accessExp = new Date(Date.now() + env.JWT_ACCESS_TTL_SECONDS * 1000);

  const { raw, hash } = generateRefreshToken();
  const refreshExp = new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000);
  const family = familyId ?? randomBytes(16).toString('hex');

  const stored = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      familyId: family,
      expiresAt: refreshExp,
      userAgent: opts.userAgent ?? null,
      ip: opts.ip ?? null,
    },
  });

  // Envelope binds the opaque token to a verifiable JWT we can match against
  // the stored hash without a DB scan.
  const envelope = await signRefreshEnvelope(stored.id, user.id);
  // Final refresh token shipped to client is {envelope}.{raw}. We split on the
  // last dot to recover both parts on refresh.
  const refreshToken = `${envelope}.${raw}`;

  return {
    accessToken,
    accessTokenExpiresAt: accessExp.toISOString(),
    refreshToken,
    refreshTokenExpiresAt: refreshExp.toISOString(),
  };
}

export async function signupWithPassword(input: {
  email: string;
  password: string;
  displayName: string;
}, opts: IssueOpts): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  if (!isSchoolEmail(email)) throw forbidden('Only school email accounts are allowed');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with this email already exists');

  const displayName = sanitizeText(input.displayName, 80);
  if (!displayName) throw badRequest('Display name required');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      // Email NOT verified yet: verification flow will set emailVerifiedAt.
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'AUTH_SIGNUP',
    entityType: 'User',
    entityId: user.id,
    ip: opts.ip,
    userAgent: opts.userAgent,
  });

  const tokens = await issueTokens(user, opts);
  return { user: publicUser(user), tokens };
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}, opts: IssueOpts): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  // Verify with dummy hash on miss to keep timing constant.
  const ok = await verifyPassword(user?.passwordHash ?? null, input.password);
  if (!user || !ok) throw unauthorized('Invalid email or password');
  if (user.status !== 'ACTIVE') throw forbidden('Account is not active');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({
    actorId: user.id,
    action: 'AUTH_LOGIN',
    entityType: 'User',
    entityId: user.id,
    ip: opts.ip,
    userAgent: opts.userAgent,
  });

  const tokens = await issueTokens(user, opts);
  return { user: publicUser(user), tokens };
}

// ----- OAuth -----

const googleClient = env.GOOGLE_OAUTH_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID)
  : null;

interface OAuthProfile {
  provider: OAuthProvider;
  providerSub: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}

async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  if (!googleClient) throw badRequest('Google OAuth not configured');
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_OAUTH_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) throw unauthorized('Invalid Google token');
  if (!payload.email_verified) throw forbidden('Google account email is not verified');
  return {
    provider: 'GOOGLE',
    providerSub: payload.sub,
    email: normalizeEmail(payload.email),
    emailVerified: true,
    displayName: sanitizeText(payload.name ?? payload.email.split('@')[0]!, 80),
  };
}

async function verifyMicrosoftIdToken(idToken: string): Promise<OAuthProfile> {
  // Microsoft id_tokens are JWTs signed by `login.microsoftonline.com`.
  // We use jose's remote JWKS verification.
  const { jwtVerify, createRemoteJWKSet } = await import('jose');
  const jwks = createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${env.MICROSOFT_OAUTH_TENANT}/discovery/v2.0/keys`),
  );
  const { payload } = await jwtVerify(idToken, jwks, {
    audience: env.MICROSOFT_OAUTH_CLIENT_ID,
  });
  const sub = (payload.oid as string | undefined) ?? (payload.sub as string | undefined);
  const email = (payload.preferred_username as string | undefined) ?? (payload.email as string | undefined);
  const name = (payload.name as string | undefined) ?? '';
  if (!sub || !email) throw unauthorized('Invalid Microsoft token');
  return {
    provider: 'MICROSOFT',
    providerSub: sub,
    email: normalizeEmail(email),
    emailVerified: true,
    displayName: sanitizeText(name || email.split('@')[0]!, 80),
  };
}

export async function loginWithOAuth(provider: OAuthProvider, idToken: string, opts: IssueOpts): Promise<AuthResult> {
  const profile = provider === 'GOOGLE' ? await verifyGoogleIdToken(idToken) : await verifyMicrosoftIdToken(idToken);

  // Domain policy must be enforced AFTER cryptographic verification: never
  // trust the email a client claims.
  if (!isSchoolEmail(profile.email)) throw forbidden('Only school email accounts are allowed');

  // Upsert identity → user.
  const user = await prisma.$transaction(async (tx) => {
    const identity = await tx.oAuthIdentity.findUnique({
      where: { provider_providerSub: { provider: profile.provider, providerSub: profile.providerSub } },
      include: { user: true },
    });
    if (identity) return identity.user;

    // Account linking by email: same school email implies same person.
    const byEmail = await tx.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      await tx.oAuthIdentity.create({
        data: {
          userId: byEmail.id,
          provider: profile.provider,
          providerSub: profile.providerSub,
          providerEmail: profile.email,
        },
      });
      return byEmail;
    }

    const created = await tx.user.create({
      data: {
        email: profile.email,
        displayName: profile.displayName,
        emailVerifiedAt: new Date(),
        oauthIdentities: {
          create: {
            provider: profile.provider,
            providerSub: profile.providerSub,
            providerEmail: profile.email,
          },
        },
      },
    });
    return created;
  });

  if (user.status !== 'ACTIVE') throw forbidden('Account is not active');
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({
    actorId: user.id,
    action: 'AUTH_OAUTH_LOGIN',
    entityType: 'User',
    entityId: user.id,
    metadata: { provider },
    ip: opts.ip,
    userAgent: opts.userAgent,
  });

  const tokens = await issueTokens(user, opts);
  return { user: publicUser(user), tokens };
}

// ----- refresh / logout -----

function splitRefresh(token: string): { envelope: string; raw: string } {
  const idx = token.lastIndexOf('.');
  if (idx <= 0 || idx === token.length - 1) throw unauthorized('Invalid refresh token');
  return { envelope: token.slice(0, idx), raw: token.slice(idx + 1) };
}

export async function refreshSession(refreshToken: string, opts: IssueOpts): Promise<AuthResult> {
  const { envelope, raw } = splitRefresh(refreshToken);

  let claim: { jti: string; sub: string };
  try {
    claim = await verifyRefreshEnvelope(envelope);
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: claim.jti } });
  if (!stored || stored.userId !== claim.sub) throw unauthorized('Invalid refresh token');
  if (stored.expiresAt < new Date()) throw unauthorized('Refresh token expired');

  // Reuse detection: a revoked token presented again means the family is
  // compromised: revoke the whole family.
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit({
      actorId: stored.userId,
      action: 'AUTH_REFRESH_REUSE',
      entityType: 'RefreshToken',
      entityId: stored.id,
      ip: opts.ip,
      userAgent: opts.userAgent,
    });
    throw unauthorized('Refresh token reuse detected');
  }

  if (stored.tokenHash !== sha256(raw)) throw unauthorized('Invalid refresh token');

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.status !== 'ACTIVE') throw forbidden('Account is not active');

  // Rotate: revoke current, issue new in same family.
  const tokens = await issueTokens(user, opts, stored.familyId);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return { user: publicUser(user), tokens };
}

export async function logout(refreshToken: string | undefined, userId?: string): Promise<void> {
  if (refreshToken) {
    try {
      const { envelope, raw } = splitRefresh(refreshToken);
      const claim = await verifyRefreshEnvelope(envelope);
      const stored = await prisma.refreshToken.findUnique({ where: { id: claim.jti } });
      if (stored && stored.tokenHash === sha256(raw) && !stored.revokedAt) {
        await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      }
    } catch {
      // swallow: logout is best-effort
    }
  } else if (userId) {
    // No refresh token provided → revoke all sessions for this user.
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export async function logoutEverywhere(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
  ]);
}

// ----- account deletion (App Store §5.1.1(v) requirement) -----

export async function softDeleteAccount(userId: string, reason?: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: now,
        // strip PII fields immediately; data is purged by a scheduled job after retention window
        displayName: 'Deleted User',
        passwordHash: null,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.deviceToken.deleteMany({ where: { userId } }),
    prisma.oAuthIdentity.deleteMany({ where: { userId } }),
  ]);

  await writeAudit({
    actorId: userId,
    action: 'ACCOUNT_DELETE',
    entityType: 'User',
    entityId: userId,
    metadata: reason ? { reason } : {},
  });
}

// ----- helpers exposed for permissions -----

export async function loadUserSafe(userId: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u || u.status !== 'ACTIVE') return null;
  return u;
}

export type { Role };
