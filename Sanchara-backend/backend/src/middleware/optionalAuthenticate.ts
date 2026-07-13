import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Optional authentication: if a valid access token is present, attach
 * `req.user`; otherwise continue as a guest. Never blocks the request — used by
 * public browse endpoints that serve guests AND authenticated users differently
 * (e.g. entitlement / gender filtering).
 *
 * An invalid/expired token is treated as "guest" rather than an error, so a
 * stale token can't break public browsing.
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(header.slice(7));
      req.user = { userId: payload.userId, role: payload.role };
    } catch {
      // Ignore — proceed as guest.
    }
  }
  next();
}
