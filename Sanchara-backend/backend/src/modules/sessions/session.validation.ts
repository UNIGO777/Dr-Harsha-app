import { z } from 'zod';
import { SESSION_STATES, REP_SCHEME_IDS } from '../../constants/enums';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// ── Start ─────────────────────────────────────────────────────────────────────
// M2.5: a session is started for a specific ProgramDay (not a flat program).
export const startSessionSchema = z.object({
  programDayId: objectId,
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
});

// ── State machine ─────────────────────────────────────────────────────────────
export const advanceStateSchema = z.object({
  nextState: z.enum(SESSION_STATES),
});

// ── Exercise completion ───────────────────────────────────────────────────────
/** One set as the patient actually performed it. */
const performedSet = z.object({
  setNumber: z.number().int().min(1),
  targetReps: z.number().int().min(0).max(200),
  completedReps: z.number().int().min(0).max(200),
  restSeconds: z.number().int().min(0).max(600).optional(),
});

export const completeExerciseSchema = z
  .object({
    setsCompleted: z.number().int().min(0).default(0),
    /** Which scheme the patient chose, and the rest they picked. */
    repScheme: z.enum(REP_SCHEME_IDS).optional(),
    restPreset: z.number().int().min(0).max(600).optional(),
    /** Per-set detail. Absent for older clients, which still record sets only. */
    sets: z.array(performedSet).max(10).optional(),
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
