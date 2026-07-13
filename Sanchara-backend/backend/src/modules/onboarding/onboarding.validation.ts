import { z } from 'zod';
import {
  GENDERS,
  EXERCISE_HISTORY_LEVELS,
  GADGET_TYPES,
} from '../../constants/enums';

/**
 * Onboarding payload (15 fields). Phone is already captured at auth. BMI is
 * DERIVED server-side (User pre-save hook) and is NOT accepted from the client.
 * maxHr is likewise derived. Strict validation — reject invalid medical data.
 */
export const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().optional(),
  age: z.number().int().min(1).max(120),
  gender: z.enum(GENDERS),
  weightKg: z.number().positive().max(500),
  heightCm: z.number().positive().max(300),
  conditions: z.array(z.string().trim().min(1)).default([]),
  painAreas: z.array(z.string().trim().min(1)).default([]),
  surgeryHistory: z.string().trim().max(2000).optional(),
  exerciseHistory: z.enum(EXERCISE_HISTORY_LEVELS),
  goal: z.string().trim().max(500).optional(),
  gadgetType: z.enum(GADGET_TYPES).default('none'),
  referralCode: z.string().trim().max(50).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
