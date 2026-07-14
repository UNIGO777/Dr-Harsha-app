/**
 * Onboarding API. The single submit goes to POST /api/onboarding and is
 * authorized by the ONBOARDING token (issued at OTP verify for new users) —
 * not the access token — so we set the Authorization header explicitly here.
 *
 * Backend responses:
 *   201 completed  -> { user, accessToken, refreshToken }   (sign the user in)
 *   200 waitlisted -> { waitlisted: true, showWaitlistModal, message, user }
 *   409 already    -> handled as an error by the caller
 */
import { useMutation } from '@tanstack/react-query';

import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { getOnboardingToken } from '@/lib/secureStore';
import type { OnboardingDraft } from '@/store/onboardingStore';
import type { User } from '@/types';

export interface OnboardingCompleted {
  success: true;
  user: User;
  accessToken: string;
  refreshToken: string;
  waitlisted?: undefined;
}

export interface OnboardingWaitlisted {
  success: true;
  waitlisted: true;
  showWaitlistModal: boolean;
  message: string;
  user: User;
}

export type SubmitOnboardingResponse = OnboardingCompleted | OnboardingWaitlisted;

/** Draft -> backend payload (drops undefined optionals; BMI is derived server-side). */
export function toOnboardingPayload(draft: OnboardingDraft) {
  return {
    name: draft.name,
    email: draft.email || undefined,
    age: draft.age,
    gender: draft.gender,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    conditions: draft.conditions,
    painAreas: draft.painAreas,
    surgeryHistory: draft.surgeryHistory || undefined,
    exerciseHistory: draft.exerciseHistory,
    goal: draft.goal || undefined,
    gadgetType: draft.gadgetType,
    referralCode: draft.referralCode || undefined,
  };
}

export function useSubmitOnboarding() {
  return useMutation({
    mutationFn: async (draft: OnboardingDraft) => {
      const onboardingToken = await getOnboardingToken();
      const { data } = await api.post<SubmitOnboardingResponse>(
        endpoints.onboarding.submit,
        toOnboardingPayload(draft),
        { headers: { Authorization: `Bearer ${onboardingToken ?? ''}` } },
      );
      return data;
    },
  });
}
