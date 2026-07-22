import { Schema, model, type Types } from 'mongoose';
import {
  PROGRAM_TYPES,
  SESSION_STATES,
  SESSION_COMPLETIONS,
  type ProgramType,
  type SessionState,
  type SessionCompletion,
} from '../constants/enums';

/**
 * Session = a single workout record. This is the richest model: it captures the
 * pain check-in, the safety-override gate (any pain score >= 8), per-exercise
 * feedback, and a DENORMALIZED snapshot of the user's group/level AT SESSION
 * TIME (those values change over time, so history must not depend on the
 * current User document).
 */
export interface IPainCheckinEntry {
  area: string;
  score: number;
}

export interface ISafetyOverride {
  triggered: boolean;
  maxScore?: number;
  overriddenAt?: Date;
}

export interface ISessionExercise {
  exercise: Types.ObjectId;
  setsCompleted: number;
  easeScore?: number;
  tooHard: boolean;
  tooEasy: boolean;
  alternativeChosen: Types.ObjectId | null;
  restTimerSeconds?: number;
}

export interface ISession {
  user: Types.ObjectId;
  program?: Types.ObjectId;
  programDay?: Types.ObjectId; // ref 'ProgramDay' (M2.5)
  dayNumber?: number; // snapshot of the program day at session time
  programType?: ProgramType;
  shortProgramTag?: string;

  state: SessionState;
  currentExerciseIndex: number; // resume pointer — survives app restarts
  painCheckin: IPainCheckinEntry[];
  safetyOverride: ISafetyOverride;
  exercises: ISessionExercise[];

  // Denormalized snapshot (group/level can change; freeze them here)
  groupAtTime?: string;
  levelAtTime?: number;

  // Metrics
  durationSeconds?: number;
  exercisesCompleted?: number;
  avgEaseScore?: number;
  hrAvg?: number;
  hrMax?: number;
  caloriesEstimate?: number;

  completion?: SessionCompletion;
  startedAt?: Date;
  endedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const painCheckinEntrySchema = new Schema<IPainCheckinEntry>(
  {
    area: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 10 },
  },
  { _id: false }
);

const safetyOverrideSchema = new Schema<ISafetyOverride>(
  {
    triggered: { type: Boolean, default: false },
    maxScore: { type: Number, min: 0, max: 10 },
    overriddenAt: { type: Date },
  },
  { _id: false }
);

const sessionExerciseSchema = new Schema<ISessionExercise>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    setsCompleted: { type: Number, default: 0, min: 0 },
    easeScore: { type: Number, min: 1, max: 10 },
    tooHard: { type: Boolean, default: false },
    tooEasy: { type: Boolean, default: false },
    alternativeChosen: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      default: null,
    },
    restTimerSeconds: { type: Number, min: 0 },
  },
  { _id: false }
);

const sessionSchema = new Schema<ISession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    program: { type: Schema.Types.ObjectId, ref: 'Program' },
    programDay: { type: Schema.Types.ObjectId, ref: 'ProgramDay' },
    dayNumber: { type: Number, min: 1 },
    programType: { type: String, enum: PROGRAM_TYPES },
    shortProgramTag: { type: String },

    // An in-progress session (state not COMPLETED/ABANDONED) persists across app
    // restarts and is NEVER auto-abandoned — the client resumes via /sessions/active.
    state: { type: String, enum: SESSION_STATES, required: true },
    currentExerciseIndex: { type: Number, default: 0, min: 0 },
    painCheckin: { type: [painCheckinEntrySchema], default: [] },
    safetyOverride: {
      type: safetyOverrideSchema,
      default: () => ({ triggered: false }),
    },
    exercises: { type: [sessionExerciseSchema], default: [] },

    // Denormalized snapshot
    groupAtTime: { type: String },
    levelAtTime: { type: Number, min: 1 },

    // Metrics
    durationSeconds: { type: Number, min: 0 },
    exercisesCompleted: { type: Number, min: 0 },
    avgEaseScore: { type: Number, min: 0, max: 10 },
    hrAvg: { type: Number, min: 0, max: 250 },
    hrMax: { type: Number, min: 0, max: 250 },
    caloriesEstimate: { type: Number, min: 0 },

    completion: { type: String, enum: SESSION_COMPLETIONS },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

// Reverse-chronological history & calendar views for a user.
sessionSchema.index({ user: 1, startedAt: -1 });

export const Session = model<ISession>('Session', sessionSchema);
