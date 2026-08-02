import { Schema, model, type Types } from 'mongoose';
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from '../constants/enums';

/**
 * Enrollment (M2.5) = a user's participation in a Program, tracking progress
 * through its days. Progress = advancing through program days (currentDay).
 *
 * SCOPE NOTE: quote Section I described level-based progression (3 qualifying
 * weeks / ease >=7.0). We are now program/day-based. CONFIRM WITH CLIENT
 * (Dr. Harsha) before M6.
 *
 * A user may have only ONE ACTIVE enrollment at a time — enforced in the
 * service layer (a partial unique index isn't used so PAUSED/COMPLETED history
 * can accumulate freely).
 */
export interface IEnrollment {
  user: Types.ObjectId;
  program: Types.ObjectId;
  /** Level the user is currently on (M2.5-L). 1 for flat/level-less programs. */
  currentLevel: number;
  /** Day within the CURRENT level. */
  currentDay: number;
  /** Days completed within the CURRENT level (reset on level-up). */
  completedDays: number[];
  /** Levels fully completed (their day sets finished). */
  completedLevels: number[];
  status: EnrollmentStatus;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    currentLevel: { type: Number, default: 1, min: 1 },
    currentDay: { type: Number, default: 1, min: 1 },
    completedDays: { type: [Number], default: [] },
    completedLevels: { type: [Number], default: [] },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'ACTIVE' },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Fast lookup of a user's active/paused enrollments.
enrollmentSchema.index({ user: 1, status: 1 });

export const Enrollment = model<IEnrollment>('Enrollment', enrollmentSchema);
