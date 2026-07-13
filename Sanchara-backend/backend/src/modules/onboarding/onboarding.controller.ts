import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import * as onboardingService from './onboarding.service';
import type { OnboardingInput } from './onboarding.validation';

/** POST /api/onboarding */
export async function submitOnboarding(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.onboardingUserId;
    if (!userId) {
      // Should be unreachable — requireOnboardingToken runs first.
      throw ApiError.unauthorized('Missing onboarding context');
    }

    const data = req.body as OnboardingInput;
    const result = await onboardingService.completeOnboarding(userId, data);

    switch (result.status) {
      case 'already_onboarded':
        // Reject a second attempt but return the existing profile (no overwrite).
        res.status(409).json({
          success: false,
          message: 'Onboarding already completed',
          user: result.user,
        });
        return;

      case 'waitlisted':
        res.status(200).json({
          success: true,
          waitlisted: true,
          showWaitlistModal: true,
          message:
            'Thanks! You are on the waitlist — this program currently serves ages 30–60.',
          user: result.user,
        });
        return;

      case 'completed':
        res.status(201).json({
          success: true,
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        return;
    }
  } catch (err) {
    next(err);
  }
}
