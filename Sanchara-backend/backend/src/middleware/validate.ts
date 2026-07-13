import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError, type ZodTypeAny } from 'zod';

/**
 * Request-validation middleware factory backed by zod.
 *
 * Provide a schema shaped like `{ body?, query?, params? }`. Each provided
 * sub-schema is parsed; on success the PARSED (coerced/defaulted) value is
 * written back onto the request so downstream handlers get typed, clean data.
 * On failure the ZodError is forwarded to the central error handler (400).
 *
 * Usage:
 *   router.post('/', validate({ body: createUserSchema }), controller.create);
 */
export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // req.query can be a read-only getter on some Express versions;
        // assign defensively.
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
        return;
      }
      next(err);
    }
  };
}

/** Helper to infer the parsed type of a schema for typing controllers. */
export type Infer<T extends ZodTypeAny> = z.infer<T>;
