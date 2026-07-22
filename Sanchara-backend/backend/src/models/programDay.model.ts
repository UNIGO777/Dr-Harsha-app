import { Schema, model, type Types } from 'mongoose';

/**
 * ProgramDay (M2.5) = one day's workout TEMPLATE (content) within a Program.
 *
 *   Program (30/90 days) → ProgramDay (Day 1..N) → Exercises (video refs)
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
    dayNumber: { type: Number, required: true, min: 1 },
    title: { type: String, trim: true },
    description: { type: String },
    isRestDay: { type: Boolean, default: false },
    exercises: { type: [programDayExerciseSchema], default: [] },
    estimatedDurationSeconds: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// No duplicate day numbers within a program.
programDaySchema.index({ program: 1, dayNumber: 1 }, { unique: true });

export const ProgramDay = model<IProgramDay>('ProgramDay', programDaySchema);
