import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: Role;
      email: string;
      tokenVersion: number;
    }

    interface Request {
      id: string;
      auth?: AuthUser;
    }
  }
}

export {};
