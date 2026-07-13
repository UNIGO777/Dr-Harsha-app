import { Schema, model, type Types } from 'mongoose';

/**
 * Server-side record of issued refresh tokens so they can be revoked (logout)
 * and rotated (refresh). The JWT itself carries a `jti` which is matched here;
 * we never store the raw token. A revoked or expired record is unusable.
 *
 * Local to the auth module.
 */
export interface IRefreshToken {
  user: Types.ObjectId;
  jti: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    // TTL: reap records after the refresh token would have expired anyway.
    expiresAt: { type: Date, required: true, expires: 0 },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
