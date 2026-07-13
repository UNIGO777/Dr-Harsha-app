import { Schema, model, type Types } from 'mongoose';
import {
  DIFFICULTIES,
  GENDER_FILTERS,
  EXERCISE_STATUSES,
  type Difficulty,
  type GenderFilter,
  type ExerciseStatus,
} from '../constants/enums';

/**
 * Exercise = master exercise library. Videos are moderated (PENDING → APPROVED
 * / REJECTED) before they can appear in programs. `videoUrl` is a local path
 * for now (CDN later).
 */
export interface IExercise {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;

  // Tags / filters
  goalTag: string[];
  areaTag: string[];
  difficulty: Difficulty;
  genderFilter: GenderFilter;
  isWarmup: boolean;
  isCooldown: boolean;
  clinicalExclusive: boolean;

  // Moderation
  status: ExerciseStatus;
  uploadedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    durationSeconds: { type: Number, required: true, min: 1, max: 90 },

    // Tags / filters
    goalTag: { type: [String], default: [], index: true },
    areaTag: { type: [String], default: [] },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    genderFilter: { type: String, enum: GENDER_FILTERS, default: 'all' },
    isWarmup: { type: Boolean, default: false },
    isCooldown: { type: Boolean, default: false },
    clinicalExclusive: { type: Boolean, default: false },

    // Moderation
    status: {
      type: String,
      enum: EXERCISE_STATUSES,
      default: 'PENDING_APPROVAL',
      index: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

// Alternative-exercise lookups (Too Hard / Too Easy) query by body area + difficulty.
exerciseSchema.index({ areaTag: 1, difficulty: 1 });

export const Exercise = model<IExercise>('Exercise', exerciseSchema);
