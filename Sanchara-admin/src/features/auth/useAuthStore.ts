import { create } from 'zustand';

import { clearSession, getAccessToken, getRefreshToken, setTokens } from '@/lib/session';
import * as authApi from './api';
import type { StaffProfile } from './api';

/**
 * Portal session state.
 *
 * `status` drives routing:
 *   'loading'  — restoring a persisted token on boot; render nothing yet
 *   'signedIn' — `staff` is populated, protected routes render
 *   'signedOut'— redirect to /login
 */
type Status = 'loading' | 'signedIn' | 'signedOut';

interface AuthState {
  status: Status;
  staff: StaffProfile | null;
  /** Verify a persisted token on app boot. */
  restore: () => Promise<void>;
  signIn: (tokens: { accessToken: string; refreshToken: string }, staff: StaffProfile) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  staff: null,

  restore: async () => {
    if (!getAccessToken()) {
      set({ status: 'signedOut', staff: null });
      return;
    }
    try {
      // Round-trips /me so a revoked or expired session doesn't render a shell
      // the user can't actually use. The axios interceptor silently refreshes
      // first if the access token has merely aged out.
      const staff = await authApi.fetchMe();
      set({ status: 'signedIn', staff });
    } catch {
      clearSession();
      set({ status: 'signedOut', staff: null });
    }
  },

  signIn: ({ accessToken, refreshToken }, staff) => {
    setTokens(accessToken, refreshToken);
    set({ status: 'signedIn', staff });
  },

  signOut: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // Best-effort server-side revoke; local state clears regardless.
      await authApi.logout(refreshToken).catch(() => {});
    }
    clearSession();
    set({ status: 'signedOut', staff: null });
  },
}));
