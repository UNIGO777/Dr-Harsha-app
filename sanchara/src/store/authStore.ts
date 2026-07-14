/**
 * Auth session — CLIENT state (zustand).
 *
 * Holds the in-memory session status the UI reacts to. Token *values* live in
 * expo-secure-store (see src/lib/secureStore.ts); this store tracks whether we're
 * authenticated / mid-onboarding and hydrates that on launch.
 */
import { create } from 'zustand';

import {
  clearTokens,
  getAccessToken,
  getOnboardingToken,
  setAccessToken,
  setOnboardingToken,
  setRefreshToken,
} from '@/lib/secureStore';

type AuthStatus = 'idle' | 'authenticated' | 'onboarding' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  phone: string | null;
  /** Read the persisted token on app launch and set status accordingly. */
  hydrate: () => Promise<void>;
  /** Fully authenticated (existing, onboarded user): persist both tokens. */
  signIn: (tokens: { accessToken: string; refreshToken: string }, phone: string) => Promise<void>;
  /** New user after OTP verify: hold the onboarding token, enter onboarding. */
  startOnboarding: (onboardingToken: string, phone: string) => Promise<void>;
  /** Clear everything + reset to unauthenticated. */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  phone: null,
  hydrate: async () => {
    // Onboarded users have an access token; new users mid-onboarding only have
    // the onboarding token; everyone else is unauthenticated.
    const accessToken = await getAccessToken();
    if (accessToken) {
      set({ status: 'authenticated' });
      return;
    }
    const onboardingToken = await getOnboardingToken();
    set({ status: onboardingToken ? 'onboarding' : 'unauthenticated' });
  },
  signIn: async ({ accessToken, refreshToken }, phone) => {
    await setAccessToken(accessToken);
    await setRefreshToken(refreshToken);
    set({ status: 'authenticated', phone });
  },
  startOnboarding: async (onboardingToken, phone) => {
    await setOnboardingToken(onboardingToken);
    set({ status: 'onboarding', phone });
  },
  signOut: async () => {
    await clearTokens();
    set({ status: 'unauthenticated', phone: null });
  },
}));
