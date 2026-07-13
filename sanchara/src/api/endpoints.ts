/**
 * Central registry of backend route paths (relative to EXPO_PUBLIC_API_URL).
 * Mirrors the Node/Express monolith's feature-folder routes. Keeping them here
 * (instead of scattered string literals) makes renames a one-line change.
 *
 * These are placeholders to be confirmed against the backend as features land.
 */
export const endpoints = {
  auth: {
    requestOtp: '/auth/otp/request',
    verifyOtp: '/auth/otp/verify',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  onboarding: {
    submit: '/onboarding',
  },
  exercises: {
    library: '/exercises',
    byId: (id: string) => `/exercises/${id}`,
  },
  sessions: {
    list: '/sessions',
    start: '/sessions/start',
  },
} as const;
