import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import * as staffService from './staff.service';
import type {
  StaffLoginInput,
  StaffRefreshInput,
  StaffLogoutInput,
} from './staff.validation';

/** POST /api/staff/auth/login */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, totpCode } = req.body as StaffLoginInput;
    const result = await staffService.login(email, password, totpCode);

    if (result.totpRequired) {
      // Not an error: credentials were right, the UI just needs to collect 2FA.
      res.status(200).json({
        success: true,
        totpRequired: true,
        message: 'Enter the 6-digit code from your authenticator app',
      });
      return;
    }

    const { totpRequired: _ignored, ...session } = result;
    res.status(200).json({ success: true, totpRequired: false, ...session });
  } catch (err) {
    next(err);
  }
}

/** POST /api/staff/auth/refresh */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as StaffRefreshInput;
    const tokens = await staffService.refresh(refreshToken);
    res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
}

/** POST /api/staff/auth/logout */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as StaffLogoutInput;
    await staffService.logout(refreshToken);
    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/staff/auth/me */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');
    const profile = await staffService.getProfile(req.user.userId);
    if (!profile) throw ApiError.notFound('Staff account not found');
    res.status(200).json({ success: true, staff: profile });
  } catch (err) {
    next(err);
  }
}
