import { Schema, model, type Types } from 'mongoose';
import {
  PROGRAM_TYPES,
  GENDER_FILTERS,
  DIFFICULTIES,
  type ProgramType,
  type GenderFilter,
  type Difficulty,
} from '../constants/enums';

/**
 * Program (M2.5) = the overall plan. Content is now 3-level:
 *   Program → ProgramDay → Exercises. The flat `exercises[]` was removed;
 *   exercises live on ProgramDay so a day is one workout.
 *
 * `type` still distinguishes the original playlist kinds plus STANDARD:
 *  - STANDARD : published catalog plan users enroll in (30/90 days)
 *  - ASSIGNED : doctor-built for a specific patient
 *  - CUSTOM   : user-built; can be locked by staff
 *  - SHORT    : canned standalone program (e.g. SP-001) — no enrollment
 */
export interface IProgram {
  type: ProgramType;
  name?: string;
  description?: string;

  // Catalog / plan metadata (M2.5)
  durationDays?: number;
  isPublished: boolean;
  thumbnailUrl?: string;

  // Recommendation tags (M2.5)
  goalTag: string[];
  suitableConditions: string[];
  targetAreas: string[];
  difficultyLevel?: Difficulty;
  ageGroups: string[]; // USER_GROUPS values

  // ASSIGNED
  createdByStaff?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  startDate?: Date;
  endDate?: Date;

  // CUSTOM
  createdByUser?: Types.ObjectId;
  isLocked: boolean;
  lockedByStaff?: Types.ObjectId;
  lockReason?: string;

  // SHORT
  shortCode?: string;
  genderFilter: GenderFilter;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const programSchema = new Schema<IProgram>(
  {
    type: { type: String, enum: PROGRAM_TYPES, required: true, index: true },
    name: { type: String, trim: true },
    description: { type: String },

    // Catalog / plan metadata
    durationDays: { type: Number, min: 1 },
    isPublished: { type: Boolean, default: false, index: true },
    thumbnailUrl: { type: String },

    // Recommendation tags
    goalTag: { type: [String], default: [] },
    suitableConditions: { type: [String], default: [] },
    targetAreas: { type: [String], default: [] },
    difficultyLevel: { type: String, enum: DIFFICULTIES },
    ageGroups: { type: [String], default: [] },

    // ASSIGNED ("Doctor's Program")
    createdByStaff: { type: Schema.Types.ObjectId, ref: 'Staff' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    startDate: { type: Date },
    endDate: { type: Date },

    // CUSTOM (user-built)
    createdByUser: { type: Schema.Types.ObjectId, ref: 'User' },
    isLocked: { type: Boolean, default: false },
    lockedByStaff: { type: Schema.Types.ObjectId, ref: 'Staff' },
    lockReason: { type: String },

    // SHORT
    shortCode: { type: String, trim: true },
    genderFilter: { type: String, enum: GENDER_FILTERS, default: 'all' },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Program = model<IProgram>('Program', programSchema);
