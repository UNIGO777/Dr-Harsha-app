/**
 * Sessions API — React Query. Mirrors the backend session engine (M5 + M2.5-L).
 *
 * A Session is the user's RECORD of doing a ProgramDay. All of these sit behind
 * authenticate + requireActiveAccess on the server, so a 403 here means the
 * trial lapsed / account is waitlisted or locked.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { ProgramType } from '@/features/programs/api';

export type SessionState =
  | 'PAIN_CHECKIN'
  | 'WARMUP'
  | 'EXERCISE_ACTIVE'
  | 'COOLDOWN_BREAK'
  | 'NEXT_EXERCISE'
  | 'COOLDOWN'
  | 'SESSION_SUMMARY'
  | 'COMPLETED'
  | 'ABANDONED';

export type SessionCompletion = 'COMPLETED' | 'PARTIAL' | 'SKIPPED';

export interface StartExercise {
  exerciseId: string;
  order: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  /** Server-resolved cover URL. Prefer this over `thumbnailUrl`, which is a raw storage key. */
  thumbnailImageUrl?: string | null;
  durationSeconds: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  areaTag: string[];
  isWarmup: boolean;
  isCooldown: boolean;
  sets?: number;
  notes?: string;
  videoUrl: string | null;
}

export interface ActiveSessionResponse {
  active: boolean;
  session?: {
    sessionId: string;
    state: SessionState;
    levelNumber?: number;
    dayNumber?: number;
    programType?: ProgramType;
    /** Resume pointer — how many exercises are already done. */
    currentExerciseIndex: number;
    painCheckin: { area: string; score: number }[];
    startedAt?: string;
  };
  exercises?: StartExercise[];
}

/**
 * The user's in-progress session, if any. Drives the "Resume" hero state so an
 * app kill mid-workout doesn't lose the user's place.
 */
export function useActiveSession(enabled = true) {
  return useQuery({
    queryKey: ['sessions', 'active'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<ActiveSessionResponse>(endpoints.sessions.active);
      return data;
    },
  });
}

export type CalendarStatus = 'green' | 'amber' | 'grey';

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  status: CalendarStatus;
  sessions: number;
  dayNumbers: number[];
}

/** Day-by-day completion for a month (YYYY-MM). Backs the week strip. */
export function useCalendar(month: string, enabled = true) {
  return useQuery({
    queryKey: ['sessions', 'calendar', month],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<{ month: string; days: CalendarDay[] }>(
        endpoints.sessions.calendar,
        { params: { month } },
      );
      return data.days;
    },
  });
}

export interface TrendsResponse {
  /** Pain score samples per body area, oldest → newest. */
  painByArea: Record<string, { date?: string; score: number }[]>;
  easeTrajectory: { date?: string; avgEaseScore: number }[];
}

export function useTrends(enabled = true) {
  return useQuery({
    queryKey: ['sessions', 'trends'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<TrendsResponse & { success: boolean }>(
        endpoints.sessions.trends,
      );
      return { painByArea: data.painByArea, easeTrajectory: data.easeTrajectory };
    },
  });
}

export interface StartSessionBlocked {
  blocked: true;
  maxScore: number;
  message: string;
  actions: string[];
}

export interface StartSessionStarted {
  blocked: false;
  sessionId: string;
  state: SessionState;
  levelNumber?: number;
  dayNumber?: number;
  currentExerciseIndex: number;
  exercises: StartExercise[];
}

export type StartSessionResult = StartSessionBlocked | StartSessionStarted;

/**
 * Start a session for a ProgramDay. The server owns the SAFETY GATE: any pain
 * score >= 8 comes back `blocked` (no session created) unless the caller passes
 * `safetyOverride: true`, which is audit-logged.
 */
export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      programDayId: string;
      painCheckin: { area: string; score: number }[];
      safetyOverride?: boolean;
      safetyOverrideReason?: string;
    }) => {
      const { data } = await api.post<StartSessionResult>(endpoints.sessions.start, input);
      return data;
    },
    onSuccess: (result) => {
      if (result.blocked) return;
      // Seed synchronously: the caller navigates straight to the player, which
      // reads this exact query. Invalidation alone would leave it reading the
      // pre-session `{active:false}` and bounce the user back out.
      qc.setQueryData<ActiveSessionResponse>(['sessions', 'active'], {
        active: true,
        session: {
          sessionId: result.sessionId,
          state: result.state,
          levelNumber: result.levelNumber,
          dayNumber: result.dayNumber,
          currentExerciseIndex: result.currentExerciseIndex,
          painCheckin: [],
        },
        exercises: result.exercises,
      });
      qc.invalidateQueries({ queryKey: ['sessions', 'active'] });
    },
  });
}

/**
 * Move the server-side state machine along. The server rejects illegal jumps,
 * so the player mirrors the real transition table:
 *   WARMUP → EXERCISE_ACTIVE → NEXT_EXERCISE → EXERCISE_ACTIVE → … → SESSION_SUMMARY
 */
export function useAdvanceState() {
  return useMutation({
    mutationFn: async ({ sessionId, nextState }: { sessionId: string; nextState: SessionState }) => {
      const { data } = await api.patch<{ success: boolean; state: SessionState }>(
        endpoints.sessions.state(sessionId),
        { nextState },
      );
      return data;
    },
  });
}

export interface CompleteExerciseResult {
  sessionId: string;
  /** Resume pointer AFTER this exercise — the index the player moves to. */
  currentExerciseIndex: number;
  alternative: {
    exerciseId: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    videoUrl: string | null;
  } | null;
}

/**
 * Record one exercise and advance the resume pointer.
 *
 * `easeScore` (1–10) is MANDATORY server-side — it feeds the progression engine
 * and the ease trajectory chart, so the player must collect it before moving on.
 * `tooHard`/`tooEasy` make the server suggest an easier/harder alternative.
 */
export function useCompleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      exerciseId,
      ...body
    }: {
      sessionId: string;
      exerciseId: string;
      setsCompleted?: number;
      easeScore: number;
      restTimerSeconds?: number;
      tooHard?: boolean;
      tooEasy?: boolean;
    }) => {
      const { data } = await api.post<CompleteExerciseResult>(
        endpoints.sessions.exerciseComplete(sessionId, exerciseId),
        body,
      );
      return data;
    },
    onSuccess: (result) => {
      // Move the resume pointer in place so the player advances to the next
      // exercise on this render rather than after a refetch round-trip.
      qc.setQueryData<ActiveSessionResponse>(['sessions', 'active'], (prev) =>
        prev?.session
          ? {
              ...prev,
              session: { ...prev.session, currentExerciseIndex: result.currentExerciseIndex },
            }
          : prev,
      );
      qc.invalidateQueries({ queryKey: ['sessions', 'active'] });
    },
  });
}

export interface CompleteSessionResult {
  session: { id: string; state: SessionState; completionStatus?: SessionCompletion };
  /** Enrollment advance outcome — null for SHORT programs, which never progress it. */
  enrollment: {
    advanced: boolean;
    currentLevel?: number;
    currentDay?: number;
    levelAdvanced?: boolean;
    programCompleted?: boolean;
  } | null;
}

/** Finalise the session. This is what advances the enrollment to the next day. */
export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { data } = await api.post<CompleteSessionResult>(
        endpoints.sessions.complete(sessionId),
        {},
      );
      return data;
    },
    onSuccess: () => {
      // Day/level moved on: the ring, week strip, calendar and trends all shift.
      qc.invalidateQueries({ queryKey: ['enrollment'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

/** Bail out of a session. Keeps the record (as ABANDONED) rather than deleting it. */
export function useAbandonSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { data } = await api.post(endpoints.sessions.abandon(sessionId), {});
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['enrollment'] });
    },
  });
}
