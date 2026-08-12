/**
 * Client enums — mirror Sanchara-backend `src/constants/enums.ts`. Keep values
 * identical; the backend validates against these exact strings.
 */
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

export const GADGET_TYPES = ['none', 'apple_watch', 'fitbit', 'garmin', 'other'] as const;
export type GadgetType = (typeof GADGET_TYPES)[number];

/** Age → group (backend): 30–45 GROUP_1, 46–60 GROUP_2, else WAITLIST. */
export const ELIGIBLE_MIN_AGE = 30;
export const ELIGIBLE_MAX_AGE = 60;

// ── Reps and recovery ─────────────────────────────────────────────────────────
// MIRRORS the backend (constants/enums.ts). One round of N reps per exercise —
// not a multi-set scheme. Someone in pain on a mat needs one decision.
export const REP_OPTIONS = [5, 10, 20] as const;
export type RepOption = (typeof REP_OPTIONS)[number];
export const DEFAULT_REPS: RepOption = 10;

/** Recovery between exercises, in seconds. */
export const REST_SECONDS = 30;
