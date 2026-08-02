import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as staffController from './staff.controller';
import {
  staffLoginSchema,
  staffRefreshSchema,
  staffLogoutSchema,
} from './staff.validation';

/**
 * Staff auth routes for the clinical portal, mounted at /api/staff/auth.
 * Login/refresh/logout are public; /me requires a staff-role access token.
 */
const router = Router();

/**
 * Brute-force guard on the password endpoint: 10 attempts per 15 min, keyed by
 * email (falling back to a normalised IP key for malformed bodies).
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return typeof email === 'string' && email.length > 0
      ? `staff-login:${email.toLowerCase()}`
      : ipKeyGenerator(req.ip ?? '');
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in a few minutes.',
    });
  },
});

router.post('/login', loginLimiter, validate({ body: staffLoginSchema }), staffController.login);
router.post('/refresh', validate({ body: staffRefreshSchema }), staffController.refresh);
router.post('/logout', validate({ body: staffLogoutSchema }), staffController.logout);

router.get(
  '/me',
  authenticate,
  requireRole('CLINICAL_STAFF', 'ADMIN'),
  staffController.me
);

export default router;
