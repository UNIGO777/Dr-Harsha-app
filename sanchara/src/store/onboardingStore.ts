/**
 * Onboarding draft — CLIENT state (zustand).
 *
 * The backend exposes a single `POST /api/onboarding` submit (no per-step save),
 * so each screen's Continue merges its field(s) into this running draft, and the
 * whole profile is submitted on the final step. Fields mirror the backend
 * onboarding schema (BMI is derived server-side and never sent).
 */
import { create } from 'zustand';

import type { ExerciseHistoryLevel, GadgetType, Gender } from '@/lib/enums';

export interface OnboardingDraft {
  name?: string;
  email?: string;
  age?: number;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  conditions: string[];
  painAreas: string[];
  surgeryHistory?: string;
  exerciseHistory?: ExerciseHistoryLevel;
  goal?: string;
  gadgetType: GadgetType;
  referralCode?: string;
}

const EMPTY_DRAFT: OnboardingDraft = {
  conditions: [],
  painAreas: [],
  gadgetType: 'none',
};

interface OnboardingState {
  draft: OnboardingDraft;
  /** Merge a partial update into the draft (called on each screen's Continue). */
  update: (patch: Partial<OnboardingDraft>) => void;
  /** Wipe the draft (after successful submit or on sign-out). */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  draft: EMPTY_DRAFT,
  update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ draft: EMPTY_DRAFT }),
}));
