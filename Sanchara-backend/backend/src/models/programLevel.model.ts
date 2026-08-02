import { Schema, model, type Types } from 'mongoose';

/**
 * ProgramLevel (M2.5-L) = one difficulty/progression tier inside a Program.
 *
 * Content model is now 4-level:
 *   Program → ProgramLevel (Level 1..N) → ProgramDay (Day 1..N per level) → Exercises
 *
 * Levels are identified by their ordinal `levelNumber` within a program (the
 * same pattern as ProgramDay.dayNumber). ProgramDay rows point at a level via
 * that ordinal; this document carries the level's metadata (title etc.).
 * A user's Enrollment advances day-by-day within a level, then level-by-level.
 *
 * Programs without any ProgramLevel docs (e.g. SHORT) remain flat: their days
 * simply have no levelNumber.
 */
export interface IProgramLevel {
  program: Types.ObjectId;
  levelNumber: number;
  title?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const programLevelSchema = new Schema<IProgramLevel>(
  {
    program: { type: Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    levelNumber: { type: Number, required: true, min: 1 },
    title: { type: String, trim: true },
    description: { type: String },
  },
  { timestamps: true }
);

// No duplicate level numbers within a program.
programLevelSchema.index({ program: 1, levelNumber: 1 }, { unique: true });

export const ProgramLevel = model<IProgramLevel>('ProgramLevel', programLevelSchema);
