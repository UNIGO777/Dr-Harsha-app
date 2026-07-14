/**
 * Client enums — mirror Sanchara-backend `src/constants/enums.ts`. Keep values
 * identical; the backend validates against these exact strings.
 */
export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const EXERCISE_HISTORY_LEVELS = ['none', 'beginner', 'intermediate', 'advanced'] as const;
export type ExerciseHistoryLevel = (typeof EXERCISE_HISTORY_LEVELS)[number];

export const GADGET_TYPES = ['none', 'apple_watch', 'fitbit', 'garmin', 'other'] as const;
export type GadgetType = (typeof GADGET_TYPES)[number];

/** Age → group (backend): 30–45 GROUP_1, 46–60 GROUP_2, else WAITLIST. */
export const ELIGIBLE_MIN_AGE = 30;
export const ELIGIBLE_MAX_AGE = 60;
