/**
 * Shared enums / string-constant unions for the whole backend.
 *
 * Pattern: each enum is a `readonly` tuple (used directly as the Mongoose
 * `enum:` validator) PLUS a derived TS union type (used in interfaces). One
 * source of truth for both runtime validation and compile-time types.
 *
 * NOTE: these will be promoted to the shared/ folder when the mobile app
 * starts. Do not add cross-cutting logic here — values only.
 */

// ── User ──────────────────────────────────────────────────────────────────
export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const EXERCISE_HISTORY_LEVELS = [
  'none',
  'beginner',
  /** Plays sport but does no structured training — active, but untrained. */
  'sports_only',
  'intermediate',
  'advanced',
] as const;
export type ExerciseHistoryLevel = (typeof EXERCISE_HISTORY_LEVELS)[number];

export const GADGET_TYPES = [
  'none',
  'apple_watch',
  'fitbit',
  'garmin',
  'other',
] as const;
export type GadgetType = (typeof GADGET_TYPES)[number];

/** GROUP_1 = age 30–45, GROUP_2 = age 46–60, WAITLIST = outside 30–60. */
export const USER_GROUPS = ['GROUP_1', 'GROUP_2', 'WAITLIST'] as const;
export type UserGroup = (typeof USER_GROUPS)[number];

export const ACCOUNT_STATUSES = ['active', 'waitlisted', 'locked'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

// ── Staff ─────────────────────────────────────────────────────────────────
export const STAFF_ROLES = ['CLINICAL_STAFF', 'ADMIN'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// ── Exercise ────────────────────────────────────────────────────────────────
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Shared by Exercise and Program (and Session-adjacent filters). */
export const GENDER_FILTERS = ['all', 'male', 'female'] as const;
export type GenderFilter = (typeof GENDER_FILTERS)[number];

export const EXERCISE_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
] as const;
export type ExerciseStatus = (typeof EXERCISE_STATUSES)[number];

// ── Program ─────────────────────────────────────────────────────────────────
// STANDARD (M2.5) = a published, day-based catalog program users enroll in
// (30/90-day plans). It is none of the three original playlist kinds, so it
// gets its own type rather than being force-fit into ASSIGNED/CUSTOM/SHORT.
export const PROGRAM_TYPES = ['STANDARD', 'ASSIGNED', 'CUSTOM', 'SHORT'] as const;
export type ProgramType = (typeof PROGRAM_TYPES)[number];

// ── Enrollment (M2.5) ─────────────────────────────────────────────────────────
export const ENROLLMENT_STATUSES = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

// ── Session ─────────────────────────────────────────────────────────────────
export const SESSION_STATES = [
  'PAIN_CHECKIN',
  'WARMUP',
  'EXERCISE_ACTIVE',
  'COOLDOWN_BREAK',
  'NEXT_EXERCISE',
  'COOLDOWN',
  'SESSION_SUMMARY',
  'COMPLETED',
  'ABANDONED',
] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const SESSION_COMPLETIONS = ['COMPLETED', 'PARTIAL', 'SKIPPED'] as const;
export type SessionCompletion = (typeof SESSION_COMPLETIONS)[number];

// ── Subscription ────────────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = [
  'TRIAL',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'TRIAL',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// ── AuditLog ────────────────────────────────────────────────────────────────
export const ACTOR_ROLES = [
  'CLINICAL_STAFF',
  'ADMIN',
  'USER',
  'SYSTEM',
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export const AUDIT_ACTIONS = [
  'LEVEL_OVERRIDE',
  'EXERCISE_ASSIGNED',
  'VIDEO_UPLOADED',
  'VIDEO_APPROVED',
  'VIDEO_REJECTED',
  'PLAYLIST_LOCKED',
  'PLAYLIST_UNLOCKED',
  'SAFETY_OVERRIDE',
  'CHATBOT_FLAGGED',
  'SUBSCRIPTION_OVERRIDE',
  /** Staff blocked/unblocked a patient, or approved one off the waitlist. */
  'ACCOUNT_STATUS_CHANGED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Audit actions that MUST carry a non-empty `reason`. */
export const AUDIT_ACTIONS_REQUIRING_REASON = [
  'LEVEL_OVERRIDE',
  'SAFETY_OVERRIDE',
  'PLAYLIST_LOCKED',
  'SUBSCRIPTION_OVERRIDE',
  'VIDEO_REJECTED',
  // Blocking cuts a patient off from prescribed exercise — always justify it.
  'ACCOUNT_STATUS_CHANGED',
] as const;

// ── Reps and rest (session engine) ────────────────────────────────────────────

/**
 * Rep counts a patient may choose for an exercise. One round of N reps, not a
 * multi-set scheme — someone in pain on a mat at 6am needs one decision, not a
 * prescription to interpret.
 *
 * TODO: CONFIRM the three options WITH DR. HARSHA
 */
export const REP_OPTIONS = [5, 10, 20] as const;
export type RepOption = (typeof REP_OPTIONS)[number];
export const DEFAULT_REPS: RepOption = 10;

/** Recovery between exercises, in seconds. */
export const REST_SECONDS = 30;

/**
 * LEGACY — the earlier multi-set schemes. Kept only so ProgressDay documents
 * written before the single-round redesign still validate; nothing writes these
 * any more.
 */
export const LEGACY_REP_SCHEME_IDS = ['10-10-10', '15-12-10', '5-5-5'] as const;
export type LegacyRepSchemeId = (typeof LEGACY_REP_SCHEME_IDS)[number];
