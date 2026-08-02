import { Schema, model, type Types } from 'mongoose';

/**
 * ProgramDay (M2.5) = one day's workout TEMPLATE (content) within a Program.
 *
 *   Program → ProgramLevel (Level 1..N) → ProgramDay (Day 1..N per level) → Exercises
 *
 * `levelNumber` scopes the day to a ProgramLevel of the same program (ordinal
 * ref, same pattern as dayNumber). Programs without levels (e.g. SHORT) leave
 * it unset and stay flat: Program → ProgramDay.
 *
 * Exercises are referenced by ObjectId and are REUSABLE across many ProgramDays
 * — video records are never duplicated. Rest days carry no exercises.
 */
export interface IProgramDayExercise {
  exercise: Types.ObjectId; // ref 'Exercise' — reused across days, never copied
  order: number;
  sets?: number;
  notes?: string;
}

export interface IProgramDay {
  program: Types.ObjectId;
  levelNumber?: number; // ProgramLevel ordinal (M2.5-L); unset = flat program
  dayNumber: number;
  title?: string;
  description?: string;
  isRestDay: boolean;
  exercises: IProgramDayExercise[];
  estimatedDurationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const programDayExerciseSchema = new Schema<IProgramDayExercise>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    order: { type: Number, required: true, min: 0 },
    sets: { type: Number, min: 1 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const programDaySchema = new Schema<IProgramDay>(
  {
    program: { type: Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    levelNumber: { type: Number, min: 1 },
    dayNumber: { type: Number, required: true, min: 1 },
    title: { type: String, trim: true },
    description: { type: String },
    isRestDay: { type: Boolean, default: false },
    exercises: { type: [programDayExerciseSchema], default: [] },
    estimatedDurationSeconds: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// No duplicate day numbers within a level (level-less days: unique per program,
// since levelNumber indexes as null). Day 1 can exist in Level 1 AND Level 2.
programDaySchema.index({ program: 1, levelNumber: 1, dayNumber: 1 }, { unique: true });

export const ProgramDay = model<IProgramDay>('ProgramDay', programDaySchema);
