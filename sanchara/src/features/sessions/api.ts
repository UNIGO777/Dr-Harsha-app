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
      if (!result.blocked) {
        qc.invalidateQueries({ queryKey: ['sessions', 'active'] });
      }
    },
  });
}
