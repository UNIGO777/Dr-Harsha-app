import 'express';
import type { TokenRole } from '../utils/jwt';

/**
 * Request augmentation for auth context.
 *  - `user` is attached by `authenticate` / `optionalAuthenticate` (access-token flow).
 *  - `onboardingUserId` is attached by `requireOnboardingToken` (onboarding flow).
 */
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: TokenRole };
      onboardingUserId?: string;
    }
  }
}

export {};
