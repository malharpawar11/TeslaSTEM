import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '@/utils/errors';
import { logger } from '@/lib/logger';
import { isProd } from '@/config/env';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

// Catch-all error handler. Maps known error shapes to safe HTTP responses and
// logs unexpected errors with full context. NEVER leaks stack traces in prod.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = String(req.id);

  if (err instanceof AppError) {
    if (!err.expose) logger.error({ err, requestId }, 'app error (server)');
    const body: ErrorBody = {
      error: {
        code: err.code,
        message: err.expose ? err.message : 'Internal server error',
        requestId,
        ...(err.expose && err.details !== undefined ? { details: err.details } : {}),
      },
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: { code: 'UNPROCESSABLE', message: 'Invalid request', requestId, details: err.flatten() },
    };
    res.status(422).json(body);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Map common Prisma errors to safe 4xx responses.
    if (err.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'Resource already exists', requestId },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Resource not found', requestId },
      });
      return;
    }
    logger.error({ err, requestId }, 'prisma known error');
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Database constraint violation', requestId },
    });
    return;
  }

  // Unknown: never expose internals.
  logger.error({ err, requestId, path: req.path, method: req.method }, 'unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: isProd ? 'Internal server error' : (err as Error)?.message ?? 'Unknown error',
      requestId,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found`, requestId: req.id },
  });
}
