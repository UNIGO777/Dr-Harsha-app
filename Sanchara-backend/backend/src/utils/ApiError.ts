/**
 * Operational error type carrying an HTTP status code.
 *
 * Throwing an `ApiError` anywhere in a request lifecycle lets the central
 * errorHandler translate it into a clean JSON response with the right status.
 * "Operational" errors are expected failures (bad input, not found, forbidden)
 * as opposed to programmer bugs.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    options?: { isOperational?: boolean; details?: unknown }
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;

    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, { details });
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, { isOperational: false });
  }
}
