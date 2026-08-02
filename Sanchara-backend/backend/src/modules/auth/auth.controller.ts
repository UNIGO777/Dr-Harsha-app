import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import * as authService from './auth.service';
import type {
  RequestOtpInput,
  VerifyOtpInput,
  RefreshInput,
  LogoutInput,
} from './auth.validation';

/** POST /api/auth/request-otp */
export async function requestOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { phone } = req.body as RequestOtpInput;
    await authService.requestOtp(phone);
    // OTP is logged to the console (mock SMS); never returned in the response.
    res.status(200).json({ success: true, message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/verify-otp */
export async function verifyOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { phone, otp } = req.body as VerifyOtpInput;
    const result = await authService.verifyOtp(phone, otp);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/refresh */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshInput;
    const tokens = await authService.rotateRefreshToken(refreshToken);
    res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me — the authenticated user's own profile. */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');
    const profile = await authService.getMyProfile(req.user.userId);
    if (!profile) throw ApiError.notFound('User not found');
    res.status(200).json({ success: true, user: profile });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as LogoutInput;
    await authService.revokeRefreshToken(refreshToken);
    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}
