import { z } from 'zod';
import { PROGRAM_TYPES, SESSION_STATES } from '../../constants/enums';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// ── Start ─────────────────────────────────────────────────────────────────────
export const startSessionSchema = z
  .object({
    programId: objectId.optional(),
    programType: z.enum(PROGRAM_TYPES),
    shortProgramTag: z.string().trim().min(1).max(50).optional(),
    painCheckin: z
      .array(
        z.object({
          area: z.string().trim().min(1),
          score: z.number().int().min(0).max(10),
        })
      )
      .default([]),
    // Client opts to start despite a high pain score (see safety gate).
    safetyOverride: z.boolean().default(false),
    safetyOverrideReason: z.string().trim().min(1).max(500).optional(),
  })
  .refine(
    (d) => d.programId !== undefined || (d.programType === 'SHORT' && d.shortProgramTag !== undefined),
    { message: 'programId is required (or shortProgramTag for SHORT programs)', path: ['programId'] }
  );

// ── State machine ─────────────────────────────────────────────────────────────
export const advanceStateSchema = z.object({
  nextState: z.enum(SESSION_STATES),
});

// ── Exercise completion ───────────────────────────────────────────────────────
export const completeExerciseSchema = z
  .object({
    setsCompleted: z.number().int().min(0).default(0),
    easeScore: z.number().int().min(1).max(10), // MANDATORY — no default, must be present
    restTimerSeconds: z.number().int().min(0).default(0),
    tooHard: z.boolean().default(false),
    tooEasy: z.boolean().default(false),
    alternativeChosenId: objectId.optional(),
  })
  .refine((d) => !(d.tooHard && d.tooEasy), {
    message: 'tooHard and tooEasy cannot both be true',
    path: ['tooHard'],
  });

// ── Session completion / abandon ──────────────────────────────────────────────
export const completeSessionSchema = z.object({
  // HR / calories come from HealthKit/Fit (M7) — accepted but optional here.
  hrAvg: z.number().min(0).max(250).optional(),
  hrMax: z.number().min(0).max(250).optional(),
  caloriesEstimate: z.number().min(0).max(5000).optional(),
});

export const abandonSessionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ── Params ────────────────────────────────────────────────────────────────────
export const sessionIdParamSchema = z.object({ id: objectId });
export const sessionExerciseParamSchema = z.object({ id: objectId, exerciseId: objectId });

// ── Read queries ──────────────────────────────────────────────────────────────
export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const calendarQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM'),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type AdvanceStateInput = z.infer<typeof advanceStateSchema>;
export type CompleteExerciseInput = z.infer<typeof completeExerciseSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
