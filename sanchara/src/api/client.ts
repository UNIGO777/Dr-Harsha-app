/**
 * Single configured axios instance for the whole app.
 *
 * - baseURL comes from EXPO_PUBLIC_API_URL (see .env.example).
 * - A request interceptor attaches the JWT from expo-secure-store to every call
 *   (Authorization: Bearer <token>) so feature code never has to think about it.
 * - A response interceptor gives us one place to handle 401s later (token refresh
 *   / forced logout). For now it just rethrows.
 */
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

import { endpoints } from '@/api/endpoints';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/secureStore';
import { useAuthStore } from '@/store/authStore';

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL && __DEV__) {
  // Surface a misconfigured env early instead of failing with confusing 404s.
  console.warn(
    '[api] EXPO_PUBLIC_API_URL is not set — copy .env.example to .env. ' +
      'Requests will be sent to a relative URL and likely fail.',
  );
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * Exchange the refresh token for a fresh access token (rotating). Uses a bare
 * axios call so it does NOT re-enter these interceptors. Returns the new access
 * token, or null if there's no refresh token / the refresh failed.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${baseURL}${endpoints.auth.refresh}`,
      { refreshToken },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } },
    );
    await setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

// Global 401 handler with SILENT REFRESH: the 15-min access token expiring is
// normal — instead of logging out, use the 7-day refresh token to get a new
// access token and retry the original request. Only if the refresh itself fails
// (no/expired refresh token) do we clear the session and bounce to auth.
// A single in-flight refresh is shared across concurrent 401s.
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const status = error?.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        // Retry — the request interceptor re-attaches the fresh access token.
        return api(original);
      }

      // Refresh unavailable/failed → session is truly dead.
      await useAuthStore.getState().signOut();
      router.replace('/');
    }

    return Promise.reject(error);
  },
);
