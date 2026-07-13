import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { StaffRole } from '../constants/enums';

/**
 * JWT helpers — the single place tokens are signed/verified. Secrets and
 * expiries come from validated env; nothing is hardcoded.
 *
 * Three token kinds, distinguished by a `type` claim so one can never be used
 * where another is expected:
 *  - access      (15m)  — API auth; carries userId + role
 *  - refresh     (7d)   — rotation; carries userId + jti (tracked server-side)
 *  - onboarding  (30m)  — issued after phone verification for a NEW user, only
 *                         accepted by the onboarding endpoint
 */

/**
 * Roles that can appear in an access token. Patients authenticate as 'USER'
 * (phone/OTP). Staff roles are here for forward-compatibility: staff login
 * (a later module) will issue tokens carrying CLINICAL_STAFF / ADMIN, which the
 * `requireRole` middleware gates on. Patient issuance still defaults to 'USER'.
 */
export type TokenRole = 'USER' | StaffRole;

export interface AccessTokenPayload {
  userId: string;
  role: TokenRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
  type: 'refresh';
}

export interface OnboardingTokenPayload {
  userId: string;
  type: 'onboarding';
}

const accessExpiry = env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'];
const refreshExpiry = env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'];
const onboardingExpiry: SignOptions['expiresIn'] = '30m';

export function signAccessToken(userId: string, role: TokenRole = 'USER'): string {
  const payload: AccessTokenPayload = { userId, role, type: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: accessExpiry });
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = { userId, jti, type: 'refresh' };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: refreshExpiry });
}

export function signOnboardingToken(userId: string): string {
  const payload: OnboardingTokenPayload = { userId, type: 'onboarding' };
  // Signed with the access secret but with a distinct `type` + short expiry.
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: onboardingExpiry });
}

/** @throws if the token is invalid/expired or not an access token. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || decoded.type !== 'access') {
    throw new Error('Not an access token');
  }
  return decoded as AccessTokenPayload;
}

/** @throws if the token is invalid/expired or not a refresh token. */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (typeof decoded === 'string' || decoded.type !== 'refresh') {
    throw new Error('Not a refresh token');
  }
  return decoded as RefreshTokenPayload;
}

/** @throws if the token is invalid/expired or not an onboarding token. */
export function verifyOnboardingToken(token: string): OnboardingTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || decoded.type !== 'onboarding') {
    throw new Error('Not an onboarding token');
  }
  return decoded as OnboardingTokenPayload;
}
