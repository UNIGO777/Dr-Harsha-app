import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireOnboardingToken } from './requireOnboardingToken';
import { onboardingSchema } from './onboarding.validation';
import { submitOnboarding } from './onboarding.controller';

/**
 * Onboarding route. Requires the onboarding token (NOT an access token) and
 * must NOT sit behind requireActiveAccess — the user has no active session yet.
 */
const router = Router();

router.post(
  '/',
  requireOnboardingToken,
  validate({ body: onboardingSchema }),
  submitOnboarding
);

export default router;
