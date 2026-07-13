/**
 * Zod schemas — mirror the backend field rules so the client fails fast with the
 * same messages the server would enforce. Keep these in sync with the backend's
 * validation as onboarding lands.
 */
import { z } from 'zod';

/** Eligibility window for the medically-supervised programme. */
export const MIN_AGE = 30;
export const MAX_AGE = 60;

/** E.164-ish phone check for the OTP screen (India default, adjust per backend). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number');

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

/** Whole years between `dob` and `now`. */
export function ageFromDob(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * The age gate. Users outside 30–60 are not rejected outright — the UI routes
 * them to a waitlist. `eligible: false` is the signal for that branch.
 */
export function checkAgeEligibility(dob: Date): { age: number; eligible: boolean } {
  const age = ageFromDob(dob);
  return { age, eligible: age >= MIN_AGE && age <= MAX_AGE };
}

export const dateOfBirthSchema = z.coerce
  .date()
  .refine((d) => d <= new Date(), 'Date of birth cannot be in the future');
