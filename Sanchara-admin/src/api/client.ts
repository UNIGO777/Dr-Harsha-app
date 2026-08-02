import axios, { type InternalAxiosRequestConfig } from 'axios';

import { clearSession, getAccessToken, getRefreshToken, setTokens } from '@/lib/session';

/**
 * Single configured axios instance for the portal.
 *
 * In dev, requests go to a relative `/api` path which Vite proxies to the
 * backend (see vite.config.ts) — same-origin, so no CORS setup needed. In
 * production, VITE_API_URL points at the deployed API.
 *
 * Access tokens live 15 minutes; a 401 triggers ONE silent refresh using the
 * 7-day refresh token and retries the original request. Only if that refresh
 * fails is the session actually dead.
 */
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

/** Exchange the refresh token for a new pair. Bare axios so it can't recurse. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${baseURL}/staff/auth/refresh`,
      { refreshToken },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } },
    );
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

// A single in-flight refresh is shared across concurrent 401s.
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const status = error?.response?.status;
    const isRefreshCall = original?.url?.includes('/staff/auth/refresh');

    if (status === 401 && original && !original._retried && !isRefreshCall) {
      original._retried = true;

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;

      if (newToken) return api(original);

      clearSession();
      // Full reload rather than router navigation: the axios layer has no
      // router access, and a hard reset is the safest way to drop stale state.
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

/** Pull a human-readable message out of an axios error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? err.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
