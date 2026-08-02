import { Schema, model, type Types } from 'mongoose';

/**
 * Server-side record of issued STAFF refresh tokens, so a portal session can be
 * revoked (logout) and rotated (refresh).
 *
 * Deliberately separate from the patient `RefreshToken` collection: that one
 * refs 'User', this one refs 'Staff'. Keeping them apart means a patient token
 * can never be exchanged for a staff session (or vice versa) — the jti lookup
 * simply misses — and each module owns its own persistence, matching how the
 * auth module owns Otp + RefreshToken.
 */
export interface IStaffRefreshToken {
  staff: Types.ObjectId;
  jti: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const staffRefreshTokenSchema = new Schema<IStaffRefreshToken>(
  {
    staff: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    // TTL: reap records once the refresh token would have expired anyway.
    expiresAt: { type: Date, required: true, expires: 0 },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const StaffRefreshToken = model<IStaffRefreshToken>(
  'StaffRefreshToken',
  staffRefreshTokenSchema
);
