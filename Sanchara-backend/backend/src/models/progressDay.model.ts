import { Schema, model, type Types } from 'mongoose';
import { REP_SCHEME_IDS, type RepSchemeId } from '../constants/enums';

/**
 * ProgressDay — what the patient ACTUALLY did on a given day, set by set.
 *
 * Distinct from Session on purpose. A Session is the run of the app: its state
 * machine, its pain check-in, whether it was abandoned. A ProgressDay is the
 * clinical record — how many reps, in how many sets, with how much rest — and
 * it is what a clinician reads to decide whether to progress someone.
 *
 * Keeping them apart matters because they have different lifetimes: a patient
 * may abandon and restart a session twice in a morning, but that is still ONE
 * day of work. `date` is the clinic-local calendar day (see utils/clinicDate),
 * the same boundary the one-session-per-day rule uses, so the two can never
 * disagree about which day a piece of work belongs to.
 */

export interface IProgressSet {
  setNumber: number;
  /** Reps the chosen scheme asked for. */
  targetReps: number;
  /** Reps the patient reported doing — may be fewer. */
  completedReps: number;
  /** Rest actually taken after this set, in seconds. */
  restSeconds?: number;
}

export interface IProgressExercise {
  exercise: Types.ObjectId;
  order: number;
  /** Which scheme the patient chose, e.g. '15-12-10'. */
  repScheme: RepSchemeId;
  /** Rest preset chosen for this exercise, in seconds. */
  restPreset: number;
  sets: IProgressSet[];
  easeScore?: number;
  tooHard: boolean;
  tooEasy: boolean;
}

export interface IProgressDay {
  user: Types.ObjectId;
  program?: Types.ObjectId;
  programDay?: Types.ObjectId;
  /** The session this work was logged through. */
  session?: Types.ObjectId;
  levelNumber?: number;
  dayNumber?: number;
  /** Clinic-local calendar day, YYYY-MM-DD. */
  date: string;
  exercises: IProgressExercise[];
  /** Rolled up on save so clinician lists don't have to aggregate. */
  totalSets: number;
  totalReps: number;
  totalRestSeconds: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const progressSetSchema = new Schema<IProgressSet>(
  {
    setNumber: { type: Number, required: true, min: 1 },
    targetReps: { type: Number, required: true, min: 0 },
    completedReps: { type: Number, required: true, min: 0 },
    restSeconds: { type: Number, min: 0 },
  },
  { _id: false }
);

const progressExerciseSchema = new Schema<IProgressExercise>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    order: { type: Number, required: true, min: 0 },
    repScheme: { type: String, enum: REP_SCHEME_IDS, required: true },
    restPreset: { type: Number, required: true, min: 0 },
    sets: { type: [progressSetSchema], default: [] },
    easeScore: { type: Number, min: 1, max: 10 },
    tooHard: { type: Boolean, default: false },
    tooEasy: { type: Boolean, default: false },
  },
  { _id: false }
);

const progressDaySchema = new Schema<IProgressDay>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    program: { type: Schema.Types.ObjectId, ref: 'Program' },
    programDay: { type: Schema.Types.ObjectId, ref: 'ProgramDay' },
    session: { type: Schema.Types.ObjectId, ref: 'Session' },
    levelNumber: { type: Number, min: 1 },
    dayNumber: { type: Number, min: 1 },
    date: { type: String, required: true },
    exercises: { type: [progressExerciseSchema], default: [] },
    totalSets: { type: Number, default: 0, min: 0 },
    totalReps: { type: Number, default: 0, min: 0 },
    totalRestSeconds: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// One record per patient per calendar day per program day. Restarting a
// session the same morning appends to the same record rather than creating a
// second one that would double-count the day's work.
progressDaySchema.index({ user: 1, date: 1, programDay: 1 }, { unique: true });

// Clinician reads: "show me this patient's recent days".
progressDaySchema.index({ user: 1, date: -1 });

/** Keep the rollups honest — they are derived, never client-supplied. */
progressDaySchema.pre('save', function recalcTotals() {
  let sets = 0;
  let reps = 0;
  let rest = 0;
  for (const ex of this.exercises) {
    sets += ex.sets.length;
    for (const s of ex.sets) {
      reps += s.completedReps;
      rest += s.restSeconds ?? 0;
    }
  }
  this.totalSets = sets;
  this.totalReps = reps;
  this.totalRestSeconds = rest;
});

export const ProgressDay = model<IProgressDay>('ProgressDay', progressDaySchema);
