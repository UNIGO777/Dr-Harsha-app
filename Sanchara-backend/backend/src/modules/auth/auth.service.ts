import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User, type IUser } from '../../models/user.model';
import { Otp } from './otp.model';
import { RefreshToken } from './refreshToken.model';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import {
  signAccessToken,
  signRefreshToken,
  signOnboardingToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { sendOtpSms } from '../../services/sms.service';
import { env, isProd } from '../../config/env';
import type {
  AccountStatus,
  Gender,
  UserGroup,
  ExerciseHistoryLevel,
} from '../../constants/enums';
import type { HydratedDocument } from 'mongoose';

/**
 * Auth service — owns OTP lifecycle, JWT issuance/rotation, and the minimal
 * user lookups other modules need. This is the ONLY place (with onboarding)
 * that touches the User model; other modules must call these functions.
 */

/**
 * OTP length and lifetime come from env (OTP_LENGTH / OTP_TTL_SECONDS) so the
 * server and the SMS template are driven by ONE setting — the Fast2SMS payload
 * derives its `otp_length` / `otp_expiry` from these same values.
 */
const OTP_MIN_INCLUSIVE = 10 ** (env.OTP_LENGTH - 1);
const OTP_MAX_EXCLUSIVE = 10 ** env.OTP_LENGTH;
const OTP_TTL_MS = env.OTP_TTL_SECONDS * 1000;
const OTP_MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type VerifyOtpResult =
  | { isNewUser: true; onboardingToken: string }
  | { isNewUser: false; user: IUser; accessToken: string; refreshToken: string };

/**
 * Generate a 6-digit OTP, store it hashed with a fresh expiry + reset attempt
 * counter (one active OTP per phone), and "send" it (mock: logged to console).
 *
 * @returns the plaintext OTP **outside production only**, so local clients can
 *          show it without tailing the server log. `undefined` in production —
 *          returning it there would hand anyone who knows a phone number a free
 *          login. The caller must respect the same gate.
 */
export async function requestOtp(phone: string): Promise<string | undefined> {
  const otp = randomInt(OTP_MIN_INCLUSIVE, OTP_MAX_EXCLUSIVE).toString();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await Otp.findOneAndUpdate(
    { phone },
    { phone, otpHash, expiresAt, attempts: 0 },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // Real delivery via Fast2SMS when configured; mock (logged) otherwise.
  // A send failure must NOT leave a usable OTP row behind: the user would be
  // told "code sent" with nothing to enter, and the row would block retries.
  try {
    await sendOtpSms(phone, otp);
  } catch (err) {
    await Otp.deleteOne({ phone });
    logger.error(`requestOtp: delivery failed for ${phone}`);
    throw ApiError.internal('Could not send the verification code. Please try again.');
  }

  return isProd ? undefined : otp;
}

/**
 * Verify an OTP. On success returns either an onboarding token (new / not-yet
 * onboarded user) or a full session (existing, onboarded user).
 */
export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  const record = await Otp.findOne({ phone });
  if (!record) {
    throw ApiError.badRequest('No OTP request found for this phone. Request a new code.');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await Otp.deleteOne({ _id: record._id });
    throw ApiError.badRequest('OTP has expired. Request a new code.');
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: record._id });
    throw ApiError.badRequest('Too many incorrect attempts. Request a new code.');
  }

  const matches = await bcrypt.compare(otp, record.otpHash);
  if (!matches) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest('Invalid OTP.');
  }

  // Consume the OTP.
  await Otp.deleteOne({ _id: record._id });

  // Find or create the user (phone is now verified).
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone, isPhoneVerified: true });
  } else if (!user.isPhoneVerified) {
    user.isPhoneVerified = true;
    await user.save();
  }

  // `group` is set only once onboarding is completed — use it as the signal.
  const isOnboarded = Boolean(user.group);
  if (!isOnboarded) {
    return { isNewUser: true, onboardingToken: signOnboardingToken(user.id) };
  }

  const tokens = await issueAuthTokens(user.id);
  return { isNewUser: false, user: user.toObject(), ...tokens };
}

/**
 * Issue a fresh access + refresh token pair and record the refresh token
 * server-side (so it can be revoked/rotated). Exported so the onboarding module
 * can issue a session at the end of onboarding.
 */
export async function issueAuthTokens(userId: string): Promise<AuthTokens> {
  const jti = randomUUID();
  await RefreshToken.create({
    user: userId,
    jti,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    revoked: false,
  });

  return {
    accessToken: signAccessToken(userId, 'USER'),
    refreshToken: signRefreshToken(userId, jti),
  };
}

/**
 * Rotate a refresh token: validate + revoke the presented one, issue a new pair.
 */
export async function rotateRefreshToken(token: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const record = await RefreshToken.findOne({ jti: payload.jti });
  if (!record || record.revoked || record.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  // The token record can outlive the account it belongs to — deleting a user
  // row does not delete their refresh tokens. Without this check a deleted (or
  // locked) account keeps minting fresh access tokens indefinitely, and the app
  // never learns the session is dead.
  const user = await User.findById(payload.userId).select('accountStatus');
  if (!user || user.accountStatus === 'locked') {
    // Burn every token this user holds, not just the presented one.
    await RefreshToken.updateMany({ user: payload.userId }, { revoked: true });
    throw ApiError.unauthorized('Session is no longer valid. Please sign in again.');
  }

  // Rotation: revoke the old token before issuing a new one.
  record.revoked = true;
  await record.save();

  return issueAuthTokens(payload.userId);
}

/**
 * Revoke a refresh token (logout). Idempotent: an already-invalid token still
 * resolves successfully so logout never leaks token validity.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(token);
    await RefreshToken.updateOne({ jti: payload.jti }, { revoked: true });
  } catch {
    // Swallow — logout is best-effort/idempotent.
  }
}

export interface AccessContext {
  accountStatus: AccountStatus;
  trialEndDate?: Date;
}

/**
 * Minimal auth context for the `requireActiveAccess` middleware. Keeps the User
 * model out of unrelated modules — they read status through this function.
 */
export async function getAccessContext(userId: string): Promise<AccessContext | null> {
  const user: HydratedDocument<IUser> | null = await User.findById(userId).select(
    'accountStatus trialEndDate'
  );
  if (!user) return null;
  return { accountStatus: user.accountStatus, trialEndDate: user.trialEndDate };
}

export interface UserContext {
  gender?: Gender;
  accountStatus: AccountStatus;
  trialEndDate?: Date;
  /** True when the user currently passes the active-access gate (see below). */
  entitled: boolean;
}

/**
 * Richer read used by modules that need gender-based filtering AND a soft
 * (non-throwing) entitlement flag — e.g. the exercises browse endpoints, which
 * serve guests and non-entitled users but withhold video access.
 * Keeps the User model out of unrelated modules.
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  const user: HydratedDocument<IUser> | null = await User.findById(userId).select(
    'gender accountStatus trialEndDate'
  );
  if (!user) return null;
  return {
    gender: user.gender,
    accountStatus: user.accountStatus,
    trialEndDate: user.trialEndDate,
    entitled: evaluateEntitlement(user.accountStatus, user.trialEndDate),
  };
}

/**
 * Soft entitlement check — the boolean form of the `requireActiveAccess` rule.
 * Keep this in sync with that middleware. M8: also return true for an active
 * Subscription (trial-independent).
 */
function evaluateEntitlement(status: AccountStatus, trialEndDate?: Date): boolean {
  if (status !== 'active') return false; // waitlisted / locked are never entitled
  const trialValid = trialEndDate !== undefined && Date.now() <= trialEndDate.getTime();
  const hasActiveSubscription = false; // M8: replace with real subscription check
  return trialValid || hasActiveSubscription;
}

export interface SessionStartContext {
  painAreas: string[];
  group?: UserGroup;
  level: number;
  gender?: Gender;
}

/**
 * User data the session engine needs at start: profile pain areas (to validate
 * the check-in) and the CURRENT group/level (denormalized into the session as a
 * snapshot). Keeps the User model out of the sessions module.
 */
export async function getSessionStartContext(
  userId: string
): Promise<SessionStartContext | null> {
  const user: HydratedDocument<IUser> | null = await User.findById(userId).select(
    'painAreas group level gender'
  );
  if (!user) return null;
  return {
    painAreas: user.painAreas ?? [],
    group: user.group,
    level: user.level,
    gender: user.gender,
  };
}

export interface MyProfile {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  goal?: string;
  conditions: string[];
  painAreas: string[];
  surgeryHistory?: string;
  exerciseHistory?: ExerciseHistoryLevel;
  preferredTime?: string;
  group?: UserGroup;
  level: number;
  accountStatus: AccountStatus;
  trialEndDate?: Date;
  entitled: boolean;
  bmi?: number;
  weeklyActivity: { currentMinutes: number; weekStartDate?: Date };
  memberSince?: Date;
}

/**
 * The authenticated user's own profile — backs the app's greeting, weekly
 * activity ring and entitlement-aware UI. Only ever returns the caller's own
 * document (userId comes from the verified access token).
 */
export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const user: HydratedDocument<IUser> | null = await User.findById(userId);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    age: user.age,
    gender: user.gender,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    goal: user.goal,
    conditions: user.conditions ?? [],
    painAreas: user.painAreas ?? [],
    surgeryHistory: user.surgeryHistory,
    exerciseHistory: user.exerciseHistory,
    preferredTime: user.preferredTime,
    group: user.group,
    level: user.level,
    accountStatus: user.accountStatus,
    trialEndDate: user.trialEndDate,
    entitled: evaluateEntitlement(user.accountStatus, user.trialEndDate),
    bmi: user.bmi,
    weeklyActivity: {
      currentMinutes: user.weeklyActivity?.currentMinutes ?? 0,
      weekStartDate: user.weeklyActivity?.weekStartDate,
    },
    memberSince: user.createdAt,
  };
}

/**
 * Fields a patient may change about themselves.
 *
 * Deliberately EXCLUDES everything clinical or commercial — group, level,
 * accountStatus, trial dates, entitlement, phone. Those are assigned by
 * onboarding or staff; letting the app PATCH them would hand a patient their
 * own difficulty tier and billing state.
 */
export interface UpdateMyProfileInput {
  name?: string;
  email?: string;
  age?: number;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  goal?: string;
  conditions?: string[];
  painAreas?: string[];
  surgeryHistory?: string;
  exerciseHistory?: ExerciseHistoryLevel;
  preferredTime?: string;
}

export async function updateMyProfile(
  userId: string,
  input: UpdateMyProfileInput
): Promise<MyProfile | null> {
  const user: HydratedDocument<IUser> | null = await User.findById(userId);
  if (!user) return null;

  // Assign only what was sent, so an omitted key never blanks a stored value.
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    (user as unknown as Record<string, unknown>)[key] = value;
  }

  // Keep the weight trail in step with the current value — the clinician's
  // weight chart reads this log, not just the latest number.
  if (input.weightKg !== undefined) {
    user.weightLog = [...(user.weightLog ?? []), { valueKg: input.weightKg, date: new Date() }];
  }

  // `bmi` and `maxHr` are derived by the User pre-save hook.
  await user.save();

  if (input.weightKg !== undefined || input.heightCm !== undefined) {
    if (typeof user.bmi === 'number') {
      user.bmiHistory = [...(user.bmiHistory ?? []), { value: user.bmi, date: new Date() }];
      await user.save();
    }
  }

  return getMyProfile(userId);
}

export interface RecommendationProfile {
  goal?: string;
  painAreas: string[];
  conditions: string[];
  exerciseHistory?: ExerciseHistoryLevel;
  group?: UserGroup;
}

/**
 * Onboarding profile fields the recommendation engine scores against. Keeps the
 * User model out of the programs module.
 */
export async function getRecommendationProfile(
  userId: string
): Promise<RecommendationProfile | null> {
  const user: HydratedDocument<IUser> | null = await User.findById(userId).select(
    'goal painAreas conditions exerciseHistory group'
  );
  if (!user) return null;
  return {
    goal: user.goal,
    painAreas: user.painAreas ?? [],
    conditions: user.conditions ?? [],
    exerciseHistory: user.exerciseHistory,
    group: user.group,
  };
}

/**
 * Increment the user's weekly activity minutes (called when a session
 * completes). M6/M7 own the weekly reset + full activity tracking.
 */
export async function addWeeklyActivityMinutes(
  userId: string,
  minutes: number
): Promise<void> {
  await User.updateOne(
    { _id: userId },
    { $inc: { 'weeklyActivity.currentMinutes': minutes } }
  );
}
