import { Schema, model, type Types } from 'mongoose';
import {
  PROGRAM_TYPES,
  GENDER_FILTERS,
  type ProgramType,
  type GenderFilter,
} from '../constants/enums';

/**
 * Program covers three kinds of playlists distinguished by `type`:
 *  - ASSIGNED ("Doctor's Program"): built by staff for a specific user.
 *  - CUSTOM: built by a user; can be locked by staff.
 *  - SHORT: canned short programs (e.g. SP-001), filtered by gender.
 * Type-specific fields are optional at the schema level; which ones apply is
 * governed by `type` (enforced in the service layer later).
 */
export interface IProgramExercise {
  exercise: Types.ObjectId;
  order: number;
}

export interface IProgram {
  type: ProgramType;
  name?: string;
  description?: string;
  exercises: IProgramExercise[];

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

const programExerciseSchema = new Schema<IProgramExercise>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    order: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const programSchema = new Schema<IProgram>(
  {
    type: { type: String, enum: PROGRAM_TYPES, required: true, index: true },
    name: { type: String, trim: true },
    description: { type: String },
    exercises: { type: [programExerciseSchema], default: [] },

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
