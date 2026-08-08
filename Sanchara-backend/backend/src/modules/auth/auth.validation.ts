import { z } from 'zod';
import { GENDERS, EXERCISE_HISTORY_LEVELS } from '../../constants/enums';

/**
 * Auth input schemas. Phone numbers are normalised (trimmed) and constrained to
 * an E.164-ish shape: optional leading '+', 10–15 digits. Reject anything else
 * at the edge.
 */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number');

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;

/**
 * Profile self-service edit (PATCH /auth/me).
 *
 * Mirrors the onboarding rules for the same fields, but every key is optional —
 * the app sends only what changed. Clinical/commercial fields (group, level,
 * accountStatus, trial dates, phone) are intentionally absent: they are not the
 * patient's to set, and Zod strips unknown keys so sending them does nothing.
 */
export const updateMyProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    age: z.number().int().min(1).max(120).optional(),
    gender: z.enum(GENDERS).optional(),
    weightKg: z.number().positive().max(500).optional(),
    heightCm: z.number().positive().max(300).optional(),
    conditions: z.array(z.string().trim().min(1)).optional(),
    painAreas: z.array(z.string().trim().min(1)).optional(),
    surgeryHistory: z.string().trim().max(2000).optional(),
    exerciseHistory: z.enum(EXERCISE_HISTORY_LEVELS).optional(),
    goal: z.string().trim().max(500).optional(),
    preferredTime: z.string().trim().max(50).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

export type UpdateMyProfileBody = z.infer<typeof updateMyProfileSchema>;
