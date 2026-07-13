import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import type { TokenRole } from '../utils/jwt';

/**
 * Role gate. MUST run after `authenticate` (which populates `req.user`).
 * Returns 403 if the authenticated principal's role is not in `allowedRoles`.
 *
 *   router.post('/', authenticate, requireRole('CLINICAL_STAFF', 'ADMIN'), handler)
 */
export function requireRole(...allowedRoles: TokenRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role) {
      next(ApiError.unauthorized('Not authenticated'));
      return;
    }
    if (!allowedRoles.includes(role)) {
      next(
        new ApiError(403, 'You do not have permission to perform this action', {
          details: { requiredRoles: allowedRoles, role },
        })
      );
      return;
    }
    next();
  };
}
