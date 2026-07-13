/**
 * Onboarding draft — CLIENT state (zustand).
 *
 * The 13-field onboarding flow spans ~10 screens. This store keeps a running
 * draft as the user moves forward/back so no data is lost between steps; only on
 * the final "almost-done" screen is the whole payload sent to the backend.
 *
 * Fields mirror the backend onboarding model (to be finalised against it). The
 * age 30–60 eligibility gate that triggers the waitlist is enforced with zod in
 * src/lib/validators.ts, not here.
 */
import { create } from 'zustand';

export interface OnboardingDraft {
  fullName?: string;
  dateOfBirth?: string; // ISO date
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  conditions?: string[];
  painAreas?: string[];
  hadSurgery?: boolean;
  surgeryDetails?: string;
  exerciseExperience?: 'none' | 'some' | 'regular';
  primaryGoal?: string;
  consentAccepted?: boolean;
}

interface OnboardingState {
  draft: OnboardingDraft;
  /** Merge a partial update into the draft (called per screen). */
  update: (patch: Partial<OnboardingDraft>) => void;
  /** Wipe the draft (after successful submit or on sign-out). */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  draft: {},
  update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ draft: {} }),
}));
