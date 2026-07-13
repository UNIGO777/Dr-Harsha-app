import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import { verifyOnboardingToken } from '../../utils/jwt';

/**
 * Guards the onboarding endpoint: requires the short-lived onboarding token
 * issued after phone verification. Attaches `req.onboardingUserId`.
 * Onboarding-specific, so it lives in the onboarding module (not the shared
 * middleware folder).
 */
export function requireOnboardingToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing onboarding token');
    }
    const payload = verifyOnboardingToken(header.slice(7));
    req.onboardingUserId = payload.userId;
    next();
  } catch (err) {
    next(err instanceof ApiError ? err : ApiError.unauthorized('Invalid onboarding token'));
  }
}
