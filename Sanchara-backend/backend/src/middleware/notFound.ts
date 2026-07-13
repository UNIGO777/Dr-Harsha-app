import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Catch-all for unmatched routes. Registered AFTER all routes but BEFORE the
 * error handler, so unknown paths flow into the same JSON error shape.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
