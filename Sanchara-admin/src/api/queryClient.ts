import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client — owns SERVER state (API data + caching). Zustand
 * owns CLIENT state (the auth session).
 *
 * `retry: 1` because the axios layer already handles the common transient case
 * (a 401 triggers a silent token refresh + retry); retrying hard past that just
 * delays showing the user a real error.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
