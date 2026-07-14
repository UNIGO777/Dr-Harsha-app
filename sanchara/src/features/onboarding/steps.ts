/**
 * Onboarding step map — drives the "STEP n OF 10" label and progress bar.
 * Order mirrors the design flow. `bmi-reveal` is an interstitial after body
 * metrics. Keep these in sync with the route files under app/(onboarding)/.
 */
export const ONBOARDING_TOTAL_STEPS = 10;

export const STEP = {
  welcome: 1,
  basicInfo: 2,
  aboutYou: 3,
  bodyMetrics: 4,
  bmiReveal: 5,
  painAreas: 6,
  conditions: 7,
  experience: 8,
  goal: 9,
  success: 10,
} as const;

export type StepKey = keyof typeof STEP;
