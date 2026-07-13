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

import { getAccessToken } from '@/lib/secureStore';

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: on 401, attempt refresh-token flow, else clear session + route to auth.
    return Promise.reject(error);
  },
);
