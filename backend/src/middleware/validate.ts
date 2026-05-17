import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, z } from 'zod';
import { unprocessable } from '@/utils/errors';

type Source = 'body' | 'query' | 'params';

interface ValidateShape<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny> {
  body?: B;
  query?: Q;
  params?: P;
}

// Validates request input against zod schemas. On success it REPLACES the
// corresponding request property with the parsed (typed, defaulted, coerced)
// value, so handlers never touch raw req.body again.
export function validate<
  B extends ZodTypeAny = z.ZodTypeAny,
  Q extends ZodTypeAny = z.ZodTypeAny,
  P extends ZodTypeAny = z.ZodTypeAny,
>(shape: ValidateShape<B, Q, P>) {
  const entries: [Source, ZodTypeAny][] = [];
  if (shape.body) entries.push(['body', shape.body]);
  if (shape.query) entries.push(['query', shape.query]);
  if (shape.params) entries.push(['params', shape.params]);

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      for (const [src, schema] of entries) {
        const parsed = schema.parse(req[src]);
        // express 5 freezes req.query getter — assign via defineProperty fallback
        Object.defineProperty(req, src, { value: parsed, writable: true, configurable: true });
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(unprocessable('Invalid request', err.flatten()));
        return;
      }
      next(err);
    }
  };
}
