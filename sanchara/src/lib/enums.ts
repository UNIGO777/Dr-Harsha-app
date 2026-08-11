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

// ── Sets, reps and rest ───────────────────────────────────────────────────────
// MIRRORS the backend (constants/enums.ts). Each scheme lists the reps for set
// 1, 2, 3 in order, so its length is the number of sets and 15-12-10 is an
// intentional pyramid.
export const REP_SCHEMES = {
  '10-10-10': [10, 10, 10],
  '15-12-10': [15, 12, 10],
  '5-5-5': [5, 5, 5],
} as const;

export type RepSchemeId = keyof typeof REP_SCHEMES;
export const REP_SCHEME_IDS = Object.keys(REP_SCHEMES) as RepSchemeId[];

/** Rest between sets, seconds. 60 is the standard starting point. */
export const REST_PRESETS = [60, 120, 180] as const;
export type RestPreset = (typeof REST_PRESETS)[number];

export const DEFAULT_REP_SCHEME: RepSchemeId = '10-10-10';
export const DEFAULT_REST_SECONDS: RestPreset = 60;

/** "3 sets · 10, 10, 10 reps" */
export function describeScheme(id: RepSchemeId): string {
  const reps = REP_SCHEMES[id];
  return `${reps.length} sets · ${reps.join(', ')} reps`;
}
