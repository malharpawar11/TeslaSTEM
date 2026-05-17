import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

// Assign a stable id to every request for log correlation + client troubleshooting.
// If a trusted upstream supplies x-request-id we accept it, otherwise we generate.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id =
    incoming && /^[A-Za-z0-9._:-]{8,128}$/.test(incoming) ? incoming : randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}
