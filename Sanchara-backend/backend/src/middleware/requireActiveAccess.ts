import type { Request, Response, NextFunction } from 'express';
import { enforceTrialLockout, isProd } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { getAccessContext } from '../modules/auth/auth.service';

/**
 * Server-side access gate for protected (video/exercise) endpoints. MUST run
 * after `authenticate`. Blocks:
 *  - waitlisted accounts        → 403 { reason: 'waitlisted' }
 *  - locked accounts            → 403 { reason: 'locked' }
 *  - expired trial + no sub     → 403 { reason: 'trial_expired' }  (Day-3 lockout)
 *
 * This enforces the Day-3 lockout on the SERVER — never trust the client to do it.
 * Auth and onboarding endpoints must NOT sit behind this.
 */
export async function requireActiveAccess(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw ApiError.unauthorized('Not authenticated');
    }

    const context = await getAccessContext(userId);
    if (!context) {
      throw ApiError.unauthorized('User no longer exists');
    }

    if (context.accountStatus === 'waitlisted') {
      throw new ApiError(403, 'Your account is on the waitlist', {
        details: { reason: 'waitlisted' },
      });
    }

    if (context.accountStatus === 'locked') {
      throw new ApiError(403, 'Your account is locked', {
        details: { reason: 'locked' },
      });
    }

    // Day-3 lockout: trial ended and (for now) no active subscription.
    const trialEnded =
      context.trialEndDate !== undefined && Date.now() > context.trialEndDate.getTime();

    // M8: also check for an active Subscription here. Until then, only the
    // trial window is evaluated, so trial-only lockout works today.
    const hasActiveSubscription = false;

    // Day-3 lockout is enforced in PRODUCTION only, and only when
    // ENFORCE_TRIAL_LOCKOUT is on. It is OFF by default because there is no
    // payment gateway yet: locking a patient out with no way to subscribe is
    // not a paywall, it is just a dead app. Turn it on with M8.
    if (enforceTrialLockout && isProd && trialEnded && !hasActiveSubscription) {
      throw new ApiError(403, 'Your free trial has ended', {
        details: { reason: 'trial_expired', requires: 'subscription_required' },
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
