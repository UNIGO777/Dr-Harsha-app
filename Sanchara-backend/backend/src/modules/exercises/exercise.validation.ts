import { z } from 'zod';
import { DIFFICULTIES, GENDER_FILTERS, EXERCISE_STATUSES } from '../../constants/enums';

/**
 * Zod schemas for the exercises module. Query params arrive as strings, so
 * numbers are coerced and booleans are parsed from the literal 'true'/'false'
 * (z.coerce.boolean treats any non-empty string as true — unsafe for filters).
 */

const queryBool = z.enum(['true', 'false']).transform((v) => v === 'true');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// ── Public browse ────────────────────────────────────────────────────────────
export const listExercisesQuerySchema = z.object({
  goalTag: z.string().trim().min(1).optional(),
  areaTag: z.string().trim().min(1).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  isWarmup: queryBool.optional(),
  isCooldown: queryBool.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Portal library list — all statuses, unlike the public browse. */
export const staffListExercisesQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(EXERCISE_STATUSES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  areaTag: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const exerciseIdParamSchema = z.object({
  id: objectId,
});

export const alternativesQuerySchema = z.object({
  direction: z.enum(['harder', 'easier']),
});

// ── Staff / Admin management ─────────────────────────────────────────────────
export const createExerciseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  // Local path placeholder for now — real upload comes in M19.
  videoUrl: z.string().trim().min(1).max(500),
  thumbnailUrl: z.string().trim().max(500).optional(),
  durationSeconds: z.number().int().min(1).max(90),
  goalTag: z.array(z.string().trim().min(1)).default([]),
  areaTag: z.array(z.string().trim().min(1)).default([]),
  difficulty: z.enum(DIFFICULTIES),
  genderFilter: z.enum(GENDER_FILTERS).default('all'),
  isWarmup: z.boolean().default(false),
  isCooldown: z.boolean().default(false),
  clinicalExclusive: z.boolean().default(false),
  // ADMIN may set an initial status (e.g. APPROVED); ignored for CLINICAL_STAFF.
  status: z.enum(EXERCISE_STATUSES).optional(),
});

export const updateExerciseSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    videoUrl: z.string().trim().min(1).max(500).optional(),
    thumbnailUrl: z.string().trim().max(500).optional(),
    durationSeconds: z.number().int().min(1).max(90).optional(),
    goalTag: z.array(z.string().trim().min(1)).optional(),
    areaTag: z.array(z.string().trim().min(1)).optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    genderFilter: z.enum(GENDER_FILTERS).optional(),
    isWarmup: z.boolean().optional(),
    isCooldown: z.boolean().optional(),
    clinicalExclusive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Provide at least one field to update',
  });

export const rejectExerciseSchema = z.object({
  rejectionReason: z.string().trim().min(1).max(1000),
});

export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type StaffListExercisesQuery = z.infer<typeof staffListExercisesQuerySchema>;
export type AlternativesQuery = z.infer<typeof alternativesQuerySchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type RejectExerciseInput = z.infer<typeof rejectExerciseSchema>;
