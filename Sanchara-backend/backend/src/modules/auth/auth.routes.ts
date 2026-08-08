import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { isProd } from '../../config/env';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import * as authController from './auth.controller';
import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  logoutSchema,
  updateMyProfileSchema,
} from './auth.validation';

/**
 * Auth routes. These are PUBLIC — they must NOT sit behind authenticate /
 * requireActiveAccess.
 */
const router = Router();

/**
 * Per-phone OTP request limiter: max 5 requests/hour. Keyed by phone (falls
 * back to a normalised IP key when phone is absent, e.g. malformed request).
 */
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Rate limiting is enforced in production only; skipped in dev/test so the OTP
  // flow can be exercised freely during local testing.
  skip: () => !isProd,
  keyGenerator: (req) => {
    const phone = (req.body as { phone?: unknown } | undefined)?.phone;
    return typeof phone === 'string' && phone.length > 0
      ? `otp:${phone}`
      : ipKeyGenerator(req.ip ?? '');
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please try again later.',
    });
  },
});

router.post(
  '/request-otp',
  otpRequestLimiter,
  validate({ body: requestOtpSchema }),
  authController.requestOtp
);

router.post('/verify-otp', validate({ body: verifyOtpSchema }), authController.verifyOtp);

router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);

router.post('/logout', validate({ body: logoutSchema }), authController.logout);

// The authenticated routes in this module — the caller's own profile.
router.get('/me', authenticate, authController.me);
router.patch(
  '/me',
  authenticate,
  validate({ body: updateMyProfileSchema }),
  authController.updateMe
);

export default router;
