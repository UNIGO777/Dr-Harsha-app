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
      retry: 2,
    },
  },
});
