import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { forbidden, unauthorized } from '@/utils/errors';

// Require ANY of the supplied roles.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden('Insufficient role'));
    next();
  };
}

// Authorize a request to manage a specific club. Pass the param name that
// holds the clubId. Super admins always pass.
export function requireClubAdmin(paramName: string = 'clubId') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) throw unauthorized();
      if (req.auth.role === 'SUPER_ADMIN') return next();

      const clubId = req.params[paramName];
      if (!clubId) throw forbidden('Club not specified');

      const assignment = await prisma.clubAdminAssignment.findUnique({
        where: { clubId_userId: { clubId, userId: req.auth.id } },
        select: { clubId: true },
      });
      if (!assignment) throw forbidden('You are not an admin of this club');

      next();
    } catch (err) {
      next(err);
    }
  };
}

// Authorize the actor as the resource owner OR a super admin.
export function requireSelfOrSuper(getUserId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(unauthorized());
    if (req.auth.role === 'SUPER_ADMIN') return next();
    const target = getUserId(req);
    if (target && target === req.auth.id) return next();
    next(forbidden());
  };
}
