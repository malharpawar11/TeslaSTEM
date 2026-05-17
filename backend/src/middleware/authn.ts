import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/tokens';
import { unauthorized } from '@/utils/errors';

function extractBearer(req: Request): string | null {
  const h = req.header('authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1]!.trim() : null;
}

// Required auth — sets req.auth or throws 401.
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) throw unauthorized('Authentication required');

    const claims = await verifyAccessToken(token);
    // Verify the access token's tokenVersion still matches the user record —
    // bumping tokenVersion invalidates all outstanding access tokens.
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, email: true, tokenVersion: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') throw unauthorized('Account is not active');
    if (user.tokenVersion !== claims.tv) throw unauthorized('Session no longer valid');

    req.auth = { id: user.id, role: user.role, email: user.email, tokenVersion: user.tokenVersion };
    next();
  } catch (err) {
    next(err instanceof Error ? err : unauthorized());
  }
}

// Optional auth — populates req.auth if a valid token is present, never throws.
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) return next();
    const claims = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, email: true, tokenVersion: true, status: true },
    });
    if (user && user.status === 'ACTIVE' && user.tokenVersion === claims.tv) {
      req.auth = { id: user.id, role: user.role, email: user.email, tokenVersion: user.tokenVersion };
    }
  } catch {
    // ignore — optional
  }
  next();
}
