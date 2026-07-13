/**
 * Auth session — CLIENT state (zustand).
 *
 * Holds the in-memory session status the UI reacts to. The token *value* itself
 * lives in expo-secure-store (see src/lib/secureStore.ts); this store only tracks
 * whether we're authenticated and hydrates that flag on launch.
 */
import { create } from 'zustand';

import { clearTokens, getAccessToken, setAccessToken } from '@/lib/secureStore';

type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  phone: string | null;
  /** Read the persisted token on app launch and set status accordingly. */
  hydrate: () => Promise<void>;
  /** Persist a fresh access token and mark the session authenticated. */
  signIn: (accessToken: string, phone?: string) => Promise<void>;
  /** Clear tokens + reset to unauthenticated. */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  phone: null,
  hydrate: async () => {
    const token = await getAccessToken();
    set({ status: token ? 'authenticated' : 'unauthenticated' });
  },
  signIn: async (accessToken, phone) => {
    await setAccessToken(accessToken);
    set({ status: 'authenticated', phone: phone ?? null });
  },
  signOut: async () => {
    await clearTokens();
    set({ status: 'unauthenticated', phone: null });
  },
}));
