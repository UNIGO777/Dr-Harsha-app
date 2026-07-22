import { z } from 'zod';
import { PROGRAM_TYPES, DIFFICULTIES, USER_GROUPS } from '../../constants/enums';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const tagArray = z.array(z.string().trim().min(1)).default([]);

// ── Program metadata ──────────────────────────────────────────────────────────
export const createProgramSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  type: z.enum(PROGRAM_TYPES).default('STANDARD'),
  durationDays: z.number().int().min(1).max(365).optional(),
  thumbnailUrl: z.string().trim().max(500).optional(),
  goalTag: tagArray,
  suitableConditions: tagArray,
  targetAreas: tagArray,
  difficultyLevel: z.enum(DIFFICULTIES).optional(),
  ageGroups: z.array(z.enum(USER_GROUPS)).default([]),
  genderFilter: z.enum(['all', 'male', 'female']).default('all'),
  shortCode: z.string().trim().min(1).max(50).optional(),
  isPublished: z.boolean().default(false),
});

export const updateProgramSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    durationDays: z.number().int().min(1).max(365).optional(),
    thumbnailUrl: z.string().trim().max(500).optional(),
    goalTag: z.array(z.string().trim().min(1)).optional(),
    suitableConditions: z.array(z.string().trim().min(1)).optional(),
    targetAreas: z.array(z.string().trim().min(1)).optional(),
    difficultyLevel: z.enum(DIFFICULTIES).optional(),
    ageGroups: z.array(z.enum(USER_GROUPS)).optional(),
    genderFilter: z.enum(['all', 'male', 'female']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

export const publishProgramSchema = z.object({
  isPublished: z.boolean(),
});

// ── Program days ──────────────────────────────────────────────────────────────
const dayExercise = z.object({
  exercise: objectId,
  order: z.number().int().min(0),
  sets: z.number().int().min(1).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createDaySchema = z
  .object({
    dayNumber: z.number().int().min(1),
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    isRestDay: z.boolean().default(false),
    exercises: z.array(dayExercise).default([]),
    estimatedDurationSeconds: z.number().int().min(0).max(36000).optional(),
  })
  .refine((d) => d.isRestDay || d.exercises.length > 0, {
    message: 'A non-rest day must have at least one exercise',
    path: ['exercises'],
  });

export const updateDaySchema = z
  .object({
    dayNumber: z.number().int().min(1).optional(),
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    isRestDay: z.boolean().optional(),
    exercises: z.array(dayExercise).optional(),
    estimatedDurationSeconds: z.number().int().min(0).max(36000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

// ── Params & public queries ───────────────────────────────────────────────────
export const programIdParamSchema = z.object({ id: objectId });
export const programDayParamSchema = z.object({ id: objectId, dayId: objectId });

export const listProgramsQuerySchema = z.object({
  goalTag: z.string().trim().min(1).optional(),
  targetAreas: z.string().trim().min(1).optional(),
  difficultyLevel: z.enum(DIFFICULTIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type CreateDayInput = z.infer<typeof createDaySchema>;
export type UpdateDayInput = z.infer<typeof updateDaySchema>;
export type ListProgramsQuery = z.infer<typeof listProgramsQuerySchema>;
