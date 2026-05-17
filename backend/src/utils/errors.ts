// Centralised application error type. Throw these from services / controllers;
// the global error handler maps them to safe HTTP responses.

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS_MAP: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(code: ErrorCode, message: string, opts: { details?: unknown; expose?: boolean } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_MAP[code];
    this.details = opts.details;
    // 4xx are safe to expose; 5xx default to generic message.
    this.expose = opts.expose ?? this.status < 500;
  }
}

export const badRequest = (msg: string, details?: unknown) => new AppError('BAD_REQUEST', msg, { details });
export const unauthorized = (msg = 'Unauthorized') => new AppError('UNAUTHORIZED', msg);
export const forbidden = (msg = 'Forbidden') => new AppError('FORBIDDEN', msg);
export const notFound = (msg = 'Not found') => new AppError('NOT_FOUND', msg);
export const conflict = (msg: string) => new AppError('CONFLICT', msg);
export const unprocessable = (msg: string, details?: unknown) =>
  new AppError('UNPROCESSABLE', msg, { details });
export const rateLimited = (msg = 'Too many requests') => new AppError('RATE_LIMITED', msg);
