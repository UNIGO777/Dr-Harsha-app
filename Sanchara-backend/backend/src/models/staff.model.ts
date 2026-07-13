import { Schema, model, type Types } from 'mongoose';
import { STAFF_ROLES, type StaffRole } from '../constants/enums';

/**
 * Staff = clinical staff + admin. Auth is email + password + TOTP (2FA).
 * `assignedPatients` drives RBAC for CLINICAL_STAFF; ADMINs ignore it (they
 * can see everyone). Enforcement lives in the auth/RBAC module later.
 */
export interface IStaff {
  email: string;
  passwordHash: string;
  totpSecret?: string;
  role: StaffRole;
  name?: string;
  assignedPatients: Types.ObjectId[];
  isActive: boolean;
  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // unique implies an index
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    totpSecret: { type: String },
    role: { type: String, enum: STAFF_ROLES, required: true },
    name: { type: String, trim: true },
    assignedPatients: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const Staff = model<IStaff>('Staff', staffSchema);
