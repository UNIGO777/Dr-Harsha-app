import { User, type IUser } from '../../models/user.model';
import { ApiError } from '../../utils/ApiError';
import { issueAuthTokens } from '../auth/auth.service';
import type { UserGroup, ExerciseHistoryLevel } from '../../constants/enums';
import type { OnboardingInput } from './onboarding.validation';

/**
 * Onboarding service. Runs AFTER phone verification (onboarding token). Owns the
 * group/level/trial assignment rules from the clinical spec.
 */

const TRIAL_DAYS = 2; // 2-day free trial (quote)

export type OnboardingResult =
  | { status: 'already_onboarded'; user: IUser }
  | { status: 'waitlisted'; user: IUser }
  | { status: 'completed'; user: IUser; accessToken: string; refreshToken: string };

/**
 * Group by age (inclusive boundaries):
 *   30–45 → GROUP_1, 46–60 → GROUP_2, otherwise → WAITLIST.
 */
export function assignGroup(age: number): UserGroup {
  if (age >= 30 && age <= 45) return 'GROUP_1';
  if (age >= 46 && age <= 60) return 'GROUP_2';
  return 'WAITLIST';
}

/**
 * Starting level from exercise history.
 *
 * TODO: CONFIRM WITH DR. HARSHA — clinical mapping, placeholder values
 */
export function assignLevel(history: ExerciseHistoryLevel): number {
  switch (history) {
    case 'none':
    case 'beginner':
      return 1;
    // Sport builds real capacity, but without structured training the movement
    // patterns we prescribe are still new — so it sits with intermediate, not
    // advanced.
    // TODO: CONFIRM 'sports_only' -> level 2 WITH DR. HARSHA
    case 'sports_only':
    case 'intermediate':
      return 2;
    case 'advanced':
      return 3;
    default:
      return 1;
  }
}

export async function completeOnboarding(
  userId: string,
  data: OnboardingInput
): Promise<OnboardingResult> {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (!user.isPhoneVerified) {
    throw ApiError.forbidden('Phone number not verified');
  }

  // Idempotency guard: `group` is set only once onboarding completes. If it is
  // already set, do NOT overwrite — return the existing profile.
  if (user.group) {
    return { status: 'already_onboarded', user: user.toObject() };
  }

  // Persist the submitted onboarding fields.
  user.name = data.name;
  user.email = data.email;
  user.age = data.age;
  user.gender = data.gender;
  user.weightKg = data.weightKg;
  user.heightCm = data.heightCm;
  user.conditions = data.conditions;
  user.painAreas = data.painAreas;
  user.surgeryHistory = data.surgeryHistory;
  user.exerciseHistory = data.exerciseHistory;
  user.goal = data.goal;
  user.gadgetType = data.gadgetType;
  user.referralCode = data.referralCode;
  // NOTE: `bmi` (from weight/height) and `maxHr` (220 - age) are derived by the
  // User pre-save hook — we deliberately do not compute them here.

  const group = assignGroup(data.age);
  user.group = group;

  // WAITLIST: age outside 30–60. No trial; app shows the waitlist modal.
  if (group === 'WAITLIST') {
    user.accountStatus = 'waitlisted';
    user.level = 1;
    await user.save();
    return { status: 'waitlisted', user: user.toObject() };
  }

  // Level from exercise history; GROUP_2 is forced to start at level 1
  // (conservative path — cannot skip levels, quote Section I).
  const level = group === 'GROUP_2' ? 1 : assignLevel(data.exerciseHistory);
  user.level = level;

  // Start the 2-day trial.
  const now = new Date();
  user.trialStartDate = now;
  user.trialEndDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  user.accountStatus = 'active';

  await user.save(); // hooks derive bmi + maxHr

  const tokens = await issueAuthTokens(user.id);
  return { status: 'completed', user: user.toObject(), ...tokens };
}
