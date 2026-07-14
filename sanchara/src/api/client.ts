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

import { getAccessToken } from '@/lib/secureStore';
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

// Global 401 handler: an invalid/expired token (access OR onboarding) means the
// session is dead. Clear it and bounce to the auth/landing screen immediately —
// this is the real-time logout (no socket needed; expiry is time-based and shows
// up as a 401 on the next request). Guarded so concurrent 401s redirect once.
let sessionExpiring = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401 && !sessionExpiring) {
      sessionExpiring = true;
      try {
        await useAuthStore.getState().signOut();
        router.replace('/');
      } finally {
        sessionExpiring = false;
      }
    }
    return Promise.reject(error);
  },
);
