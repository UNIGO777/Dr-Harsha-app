import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
// otplib v13 is a functional API (the old `authenticator` singleton is gone) and
// `verify` is async, returning { valid, delta, ... }.
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import { Staff, type IStaff } from '../../models/staff.model';
import { StaffRefreshToken } from './staffRefreshToken.model';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import type { StaffRole } from '../../constants/enums';
import type { HydratedDocument } from 'mongoose';

/**
 * Staff auth service — the clinical portal's login.
 *
 * Patients authenticate with phone + OTP (see modules/auth); staff use
 * email + password + optional TOTP. Both issue the SAME access-token shape, but
 * staff tokens carry role CLINICAL_STAFF or ADMIN, which is what `requireRole`
 * gates the management endpoints on.
 */

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_ROUNDS = 10;
const TOTP_TOLERANCE_SECONDS = 30;

export interface StaffTokens {
  accessToken: string;
  refreshToken: string;
}

export interface StaffProfile {
  id: string;
  email: string;
  name?: string;
  role: StaffRole;
  isActive: boolean;
  totpEnabled: boolean;
  assignedPatientCount: number;
  lastLoginAt?: Date;
}

function toProfile(staff: HydratedDocument<IStaff>): StaffProfile {
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    isActive: staff.isActive,
    totpEnabled: Boolean(staff.totpSecret),
    assignedPatientCount: staff.assignedPatients.length,
    lastLoginAt: staff.lastLoginAt,
  };
}

/** Hash a plaintext password — used by the seed script and future admin CRUD. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function issueTokens(staffId: string, role: StaffRole): Promise<StaffTokens> {
  const jti = randomUUID();
  await StaffRefreshToken.create({
    staff: staffId,
    jti,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    revoked: false,
  });
  return {
    accessToken: signAccessToken(staffId, role),
    refreshToken: signRefreshToken(staffId, jti),
  };
}

export type LoginResult =
  | { totpRequired: true }
  | ({ totpRequired: false; staff: StaffProfile } & StaffTokens);

/**
 * Verify credentials and issue a portal session.
 *
 * Returns `{ totpRequired: true }` when the account has 2FA enrolled but no code
 * was supplied — the UI then reveals the authenticator field. Invalid email and
 * invalid password produce the SAME generic error so the endpoint can't be used
 * to enumerate staff accounts.
 */
export async function login(
  email: string,
  password: string,
  totpCode?: string
): Promise<LoginResult> {
  const invalid = ApiError.unauthorized('Invalid email or password');

  const staff = await Staff.findOne({ email });
  if (!staff) {
    // Spend roughly the same time as a real comparison to blunt timing analysis.
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');
    throw invalid;
  }
  if (!staff.isActive) {
    throw ApiError.forbidden('This staff account has been deactivated');
  }

  const passwordOk = await bcrypt.compare(password, staff.passwordHash);
  if (!passwordOk) throw invalid;

  if (staff.totpSecret) {
    if (!totpCode) {
      return { totpRequired: true };
    }
    // ±30s tolerance absorbs clock skew between the server and the phone.
    const result = await verifyTotp({
      secret: staff.totpSecret,
      token: totpCode,
      epochTolerance: TOTP_TOLERANCE_SECONDS,
    });
    if (!result.valid) {
      throw ApiError.unauthorized('Invalid authenticator code');
    }
  }

  staff.lastLoginAt = new Date();
  await staff.save();

  const tokens = await issueTokens(staff.id, staff.role);
  return { totpRequired: false, staff: toProfile(staff), ...tokens };
}

/** Rotate a staff refresh token: validate + revoke the old one, issue a new pair. */
export async function refresh(token: string): Promise<StaffTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const record = await StaffRefreshToken.findOne({ jti: payload.jti });
  if (!record || record.revoked || record.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Session is no longer valid');
  }

  const staff = await Staff.findById(payload.userId);
  if (!staff || !staff.isActive) {
    throw ApiError.unauthorized('Staff account is unavailable');
  }

  record.revoked = true;
  await record.save();

  return issueTokens(staff.id, staff.role);
}

/** Revoke a staff refresh token (logout). Idempotent — never leaks validity. */
export async function logout(token: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(token);
    await StaffRefreshToken.updateOne({ jti: payload.jti }, { revoked: true });
  } catch {
    // Swallow — logout is best-effort.
  }
}

/** The authenticated staff member's own profile (backs the portal shell). */
export async function getProfile(staffId: string): Promise<StaffProfile | null> {
  const staff = await Staff.findById(staffId);
  if (!staff) return null;
  return toProfile(staff);
}

/**
 * Begin TOTP enrolment: generate a secret and the otpauth:// URI to render as a
 * QR code. The secret is NOT persisted until `confirmTotp` proves the staff
 * member can produce a valid code — otherwise a mistyped setup would lock them
 * out of their own account.
 */
export function beginTotpEnrolment(email: string): { secret: string; otpauthUrl: string } {
  const secret = generateSecret();
  return {
    secret,
    otpauthUrl: generateURI({ issuer: 'Sanchara', label: email, secret }),
  };
}

/** Finish TOTP enrolment by verifying a code against the pending secret. */
export async function confirmTotpEnrolment(
  staffId: string,
  secret: string,
  totpCode: string
): Promise<void> {
  const result = await verifyTotp({
    secret,
    token: totpCode,
    epochTolerance: TOTP_TOLERANCE_SECONDS,
  });
  if (!result.valid) {
    throw ApiError.badRequest('That code did not match — check your authenticator app');
  }
  const updated = await Staff.updateOne({ _id: staffId }, { $set: { totpSecret: secret } });
  if (updated.matchedCount === 0) throw ApiError.notFound('Staff account not found');
}
