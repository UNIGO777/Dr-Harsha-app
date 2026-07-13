import { Schema, model } from 'mongoose';

/**
 * One active OTP per phone (upserted on each request). Stored HASHED with a
 * short expiry and an attempt counter. A TTL index reaps expired docs, but code
 * still checks `expiresAt` because TTL cleanup is only approximate.
 *
 * Local to the auth module — no other module should touch OTPs.
 */
export interface IOtp {
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    otpHash: { type: String, required: true },
    // TTL: Mongo removes the doc once `expiresAt` passes.
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Otp = model<IOtp>('Otp', otpSchema);
