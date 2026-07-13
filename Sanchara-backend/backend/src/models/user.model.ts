import { Schema, model } from 'mongoose';
import {
  GENDERS,
  EXERCISE_HISTORY_LEVELS,
  GADGET_TYPES,
  USER_GROUPS,
  ACCOUNT_STATUSES,
  type Gender,
  type ExerciseHistoryLevel,
  type GadgetType,
  type UserGroup,
  type AccountStatus,
} from '../constants/enums';
import { calculateBmi } from '../utils/bmiCalculator';

/**
 * User = patient. Auth is phone + OTP (NO password — clinical staff/admin
 * accounts with passwords live in the Staff model).
 */

// ── Embedded subdocument shapes ─────────────────────────────────────────────
export interface IBmiEntry {
  value: number;
  date: Date;
}

export interface IWeightEntry {
  valueKg: number;
  date: Date;
}

export interface IWeeklyActivity {
  currentMinutes: number;
  weekStartDate?: Date;
}

// ── Document interface ──────────────────────────────────────────────────────
export interface IUser {
  // Auth
  phone: string;
  isPhoneVerified: boolean;

  // Onboarding
  name?: string;
  email?: string;
  age?: number;
  gender?: Gender;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  conditions: string[];
  painAreas: string[];
  surgeryHistory?: string;
  exerciseHistory?: ExerciseHistoryLevel;
  goal?: string;
  gadgetType: GadgetType;
  preferredTime?: string;
  referralCode?: string;

  // Assignment
  group?: UserGroup;
  level: number;

  // Trial / status
  trialStartDate?: Date;
  trialEndDate?: Date;
  accountStatus: AccountStatus;

  // Embedded history
  bmiHistory: IBmiEntry[];
  weightLog: IWeightEntry[];

  // Health
  restingHr?: number;
  maxHr?: number;
  lastHealthSyncAt?: Date;

  // Weekly activity
  weeklyActivity: IWeeklyActivity;

  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ─────────────────────────────────────────────────────────────
const bmiEntrySchema = new Schema<IBmiEntry>(
  {
    value: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const weightEntrySchema = new Schema<IWeightEntry>(
  {
    valueKg: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const weeklyActivitySchema = new Schema<IWeeklyActivity>(
  {
    currentMinutes: { type: Number, default: 0, min: 0 },
    weekStartDate: { type: Date },
  },
  { _id: false }
);

// ── Main schema ─────────────────────────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    // Auth
    phone: {
      type: String,
      required: true,
      unique: true, // unique implies an index — no separate index:true needed
      trim: true,
    },
    isPhoneVerified: { type: Boolean, default: false },

    // Onboarding
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    age: { type: Number, min: 1, max: 120 },
    gender: { type: String, enum: GENDERS },
    weightKg: { type: Number, min: 0, max: 500 },
    heightCm: { type: Number, min: 0, max: 300 },
    bmi: { type: Number, min: 0 }, // auto-calculated in pre-save hook
    conditions: { type: [String], default: [] },
    painAreas: { type: [String], default: [] },
    surgeryHistory: { type: String },
    exerciseHistory: { type: String, enum: EXERCISE_HISTORY_LEVELS },
    goal: { type: String },
    gadgetType: { type: String, enum: GADGET_TYPES, default: 'none' },
    preferredTime: { type: String }, // e.g. "07:30"
    referralCode: { type: String, trim: true },

    // Assignment (value stored here; assignment logic lives in a later module)
    group: { type: String, enum: USER_GROUPS },
    level: { type: Number, default: 1, min: 1 },

    // Trial / status
    trialStartDate: { type: Date },
    trialEndDate: { type: Date },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'active',
      index: true,
    },

    // Embedded history
    bmiHistory: { type: [bmiEntrySchema], default: [] },
    weightLog: { type: [weightEntrySchema], default: [] },

    // Health
    restingHr: { type: Number, min: 0, max: 250 },
    maxHr: { type: Number, min: 0, max: 250 }, // derived: 220 - age
    lastHealthSyncAt: { type: Date },

    // Weekly activity
    weeklyActivity: {
      type: weeklyActivitySchema,
      default: () => ({ currentMinutes: 0 }),
    },
  },
  { timestamps: true }
);

/**
 * Recalculate derived fields before save:
 *  - `bmi` from weightKg/heightCm whenever either changes
 *  - `maxHr` (220 - age) whenever age changes
 * Guards against missing/invalid inputs so partial onboarding never throws.
 */
userSchema.pre('save', function recalcDerivedFields() {
  if (this.isModified('weightKg') || this.isModified('heightCm')) {
    const w = this.weightKg;
    const h = this.heightCm;
    if (typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0) {
      this.bmi = calculateBmi(w, h).bmi;
    }
  }

  if (this.isModified('age') && typeof this.age === 'number' && this.age > 0) {
    this.maxHr = 220 - this.age;
  }
});

export const User = model<IUser>('User', userSchema);
