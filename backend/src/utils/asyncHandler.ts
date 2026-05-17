import type { NextFunction, Request, Response } from 'express';

// Wraps an async route handler so rejected promises reach the global error middleware.
export const asyncHandler =
  <Req extends Request = Request, Res extends Response = Response>(
    fn: (req: Req, res: Res, next: NextFunction) => Promise<unknown>,
  ) =>
  (req: Req, res: Res, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
