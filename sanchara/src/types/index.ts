/**
 * Shared TS types that mirror the backend models. These are intentionally light
 * placeholders — tighten them against the real API responses as endpoints land.
 */

export interface User {
  id: string;
  phone: string;
  fullName?: string;
  onboardingComplete: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  /** Bunny.net HLS URL (wired in a later phase via expo-video). */
  videoUrl?: string;
  durationSec?: number;
  targetAreas?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
