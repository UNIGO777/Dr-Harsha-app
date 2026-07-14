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
import { useMutation } from '@tanstack/react-query';

import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { User } from '@/types';

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
