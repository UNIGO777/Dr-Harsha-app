import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { isProd } from '../config/env';

interface ErrorResponse {
  success: false;
  message: string;
  details?: unknown;
  stack?: string;
}

/**
 * Central Express error handler. MUST be registered LAST in app.ts.
 *
 * Normalises every thrown/`next()`-ed error into a consistent JSON shape:
 *   { success: false, message, details? }
 *
 * Logs 5xx as errors and 4xx as warnings so noisy client mistakes don't drown
 * out real server failures.
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Database validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  const logContext = `${req.method} ${req.originalUrl} -> ${statusCode}`;
  if (statusCode >= 500) {
    logger.error(`${logContext}: ${message}`, {
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else {
    logger.warn(`${logContext}: ${message}`);
  }

  const body: ErrorResponse = { success: false, message };
  if (details !== undefined) body.details = details;
  // Expose stack only outside production to aid local debugging.
  if (!isProd && err instanceof Error) body.stack = err.stack;

  res.status(statusCode).json(body);
};
