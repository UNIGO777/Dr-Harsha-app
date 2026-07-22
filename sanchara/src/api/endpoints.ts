/**
 * Central registry of backend route paths (relative to EXPO_PUBLIC_API_URL).
 * Mirrors the Node/Express monolith's feature-folder routes. Keeping them here
 * (instead of scattered string literals) makes renames a one-line change.
 *
 * These are placeholders to be confirmed against the backend as features land.
 */
export const endpoints = {
  auth: {
    requestOtp: '/auth/request-otp',
    verifyOtp: '/auth/verify-otp',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  onboarding: {
    submit: '/onboarding',
  },
  exercises: {
    library: '/exercises',
    byId: (id: string) => `/exercises/${id}`,
  },
  programs: {
    list: '/programs',
    recommended: '/programs/recommended',
    byId: (id: string) => `/programs/${id}`,
  },
  enrollments: {
    root: '/enrollments',
    me: '/enrollments/me',
    today: '/enrollments/me/today',
  },
  sessions: {
    list: '/sessions',
    start: '/sessions/start',
  },
} as const;
