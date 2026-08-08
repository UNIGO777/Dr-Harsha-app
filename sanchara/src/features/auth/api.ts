/**
 * Auth API — React Query mutations over the shared axios instance.
 *
 * Backend contract (Sanchara-backend `/auth`):
 *   POST /auth/request-otp { phone }            -> { success, message }
 *   POST /auth/verify-otp  { phone, otp }       -> new user:  { isNewUser:true, onboardingToken }
 *                                                  existing:  { isNewUser:false, user, accessToken, refreshToken }
 *
 * `phone` must be E.164-ish (backend regex /^\+?[1-9]\d{9,14}$/), e.g. "+919876543210".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { User } from '@/types';

/** The authenticated user's own profile — GET /auth/me. */
export interface MyProfile {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  goal?: string;
  conditions: string[];
  painAreas: string[];
  surgeryHistory?: string;
  exerciseHistory?: 'none' | 'beginner' | 'intermediate' | 'advanced';
  preferredTime?: string;
  group?: 'GROUP_1' | 'GROUP_2' | 'WAITLIST';
  /** Difficulty attribute only — NOT the progression driver (that's enrollment levels). */
  level: number;
  accountStatus: 'active' | 'waitlisted' | 'locked';
  trialEndDate?: string;
  /** Passes the active-access gate right now (trial valid / subscribed). */
  entitled: boolean;
  bmi?: number;
  weeklyActivity: { currentMinutes: number; weekStartDate?: string };
  /** Account creation date — "member since" on the profile. */
  memberSince?: string;
}

/** The subset of the profile a patient may change (PATCH /auth/me). */
export type UpdateMyProfileInput = Partial<
  Pick<
    MyProfile,
    | 'name'
    | 'email'
    | 'age'
    | 'gender'
    | 'heightCm'
    | 'weightKg'
    | 'goal'
    | 'conditions'
    | 'painAreas'
    | 'surgeryHistory'
    | 'exerciseHistory'
    | 'preferredTime'
  >
>;

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'me'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<{ user: MyProfile }>(endpoints.auth.me);
      return data.user;
    },
  });
}

/**
 * Patient self-service profile edit. The server returns the FULL refreshed
 * profile, so the cache is replaced with the authoritative version rather than
 * optimistically patched — height/weight edits recompute BMI server-side, and
 * guessing that here would show a stale number.
 */
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMyProfileInput) => {
      const { data } = await api.patch<{ user: MyProfile }>(endpoints.auth.me, input);
      return data.user;
    },
    onSuccess: (user) => {
      qc.setQueryData(['auth', 'me'], user);
      // Pain areas drive the session check-in; a change must reach it.
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export interface RequestOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpNewUser {
  success: boolean;
  isNewUser: true;
  onboardingToken: string;
}

export interface VerifyOtpExistingUser {
  success: boolean;
  isNewUser: false;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type VerifyOtpResponse = VerifyOtpNewUser | VerifyOtpExistingUser;

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const { data } = await api.post<RequestOtpResponse>(endpoints.auth.requestOtp, { phone });
      return data;
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone, otp }: { phone: string; otp: string }) => {
      const { data } = await api.post<VerifyOtpResponse>(endpoints.auth.verifyOtp, { phone, otp });
      return data;
    },
  });
}
