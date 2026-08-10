/**
 * Shared React Query client. React Query owns *server* state (API data + caching);
 * zustand owns *client* state (auth session flags, onboarding draft). Keeping the
 * client in its own module lets both the provider and imperative code (prefetch,
 * invalidation) reach the same cache.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile networks are flaky and screens remount often; a small stale window
      // avoids refetch storms without serving badly stale data.
      staleTime: 30_000,
      // Never retry an auth failure. A 401/403 is a settled answer — the
      // session is dead or the account is blocked — and retrying only delays
      // the sign-out the axios interceptor is trying to perform.
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});
