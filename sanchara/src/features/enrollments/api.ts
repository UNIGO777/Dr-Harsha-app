/**
 * Enrollments API — React Query. Mirrors the backend enrollments module (M2.5).
 * A user holds at most ONE active enrollment; that state gates the dashboard.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { ProgramType } from '@/features/programs/api';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ABANDONED';

export interface ProgramMeta {
  id: string;
  name?: string;
  type: ProgramType;
  durationDays?: number;
  thumbnailUrl?: string;
  /** Server-resolved cover URL. Prefer this over `thumbnailUrl`, which is a raw storage key. */
  thumbnailImageUrl?: string | null;
}

export interface EnrollmentView {
  id: string;
  programId: string;
  program: ProgramMeta | null;
  status: EnrollmentStatus;
  /** Progress is level-wise: day-by-day within a level, then level-by-level. */
  currentLevel: number;
  currentDay: number;
  /** Days completed within the CURRENT level (resets on level-up). */
  completedDays: number[];
  completedLevels: number[];
  totalLevels: number;
  totalDays?: number;
  percentComplete: number;
  startedAt?: string;
  completedAt?: string;
}

/** One exercise in today's workout, with a playable URL (entitled users only). */
export interface TodayExercise {
  exerciseId: string;
  order: number;
  sets?: number;
  notes?: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  durationSeconds: number;
  thumbnailUrl?: string;
  /** Server-resolved cover URL. Prefer this over `thumbnailUrl`, which is a raw storage key. */
  thumbnailImageUrl?: string | null;
  videoUrl: string | null;
}

export interface TodayView {
  enrollmentId: string;
  programId: string;
  /** null when no ProgramDay is authored for the current level/day yet. */
  programDayId: string | null;
  levelNumber?: number;
  levelTitle?: string;
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  hasContent: boolean;
  /**
   * True when a day was already completed today. One program day per calendar
   * day — the pointer has moved on, but this day can't be started until the
   * date does too. The server rejects a start either way; this just lets the
   * UI say so before the patient taps.
   */
  locked: boolean;
  /** Clinic-local date (YYYY-MM-DD) this unlocks. Set only when locked. */
  unlocksOn?: string;
  exercises: TodayExercise[];
}

export interface AdvanceResult {
  advanced: boolean;
  currentLevel?: number;
  currentDay?: number;
  status?: EnrollmentStatus;
  completedDays?: number[];
  completedLevels?: number[];
  levelAdvanced?: boolean;
  programCompleted?: boolean;
}

/** Current ACTIVE enrollment, or null if the user hasn't picked a program yet. */
export function useMyEnrollment() {
  return useQuery({
    queryKey: ['enrollment', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ enrollment: EnrollmentView | null }>(endpoints.enrollments.me);
      return data.enrollment;
    },
  });
}

/**
 * Today's workout for the active enrollment (current level + day). 400s when the
 * user has no active enrollment — the caller treats that as "not enrolled".
 */
export function useToday(enabled = true) {
  return useQuery({
    queryKey: ['enrollment', 'today'],
    enabled,
    retry: false, // a 400 here is a real state, not a transient failure
    queryFn: async () => {
      const { data } = await api.get<{ today: TodayView }>(endpoints.enrollments.today);
      return data.today;
    },
  });
}

/**
 * Rest days have no session to complete, so the app marks them done explicitly.
 * Advances the enrollment with the same level-up rules as a workout day.
 */
export function useCompleteRestDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AdvanceResult>(endpoints.enrollments.restDayComplete);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollment'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

/** True when the backend rejects because an active enrollment already exists. */
export function isActiveEnrollmentConflict(err: unknown): boolean {
  const e = err as AxiosError<{ details?: { reason?: string } }>;
  return e?.response?.status === 409 && e.response?.data?.details?.reason === 'active_enrollment_exists';
}

/**
 * True when the backend rejects because the patient already did a day today
 * (one program day per calendar day). Returns the unlock date when it does, so
 * the UI can say exactly when to come back rather than just failing.
 */
export function dayAlreadyCompleted(err: unknown): { unlocksOn?: string } | null {
  const e = err as AxiosError<{ details?: { reason?: string; unlocksOn?: string } }>;
  if (e?.response?.status !== 409) return null;
  if (e.response?.data?.details?.reason !== 'day_already_completed') return null;
  return { unlocksOn: e.response.data.details.unlocksOn };
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      programId,
      switchExisting,
      levelNumber,
    }: {
      programId: string;
      switchExisting?: boolean;
      /** The difficulty tier the patient chose. Omitted → server picks the lowest. */
      levelNumber?: number;
    }) => {
      const { data } = await api.post<{ enrollment: EnrollmentView }>(
        endpoints.enrollments.root,
        { programId, levelNumber },
        { params: switchExisting ? { switch: true } : undefined },
      );
      return data.enrollment;
    },
    onSuccess: (enrollment) => {
      // Seed the cache SYNCHRONOUSLY with the enrollment we just created.
      //
      // The caller navigates straight into /(app), whose layout gates on this
      // exact query. Invalidation alone is not enough: it only marks the entry
      // stale, so the gate would still read the cached `null` from before the
      // user enrolled and bounce them right back to program selection — the
      // "first tap does nothing, second tap works" bug. POST /enrollments and
      // GET /enrollments/me both return the same EnrollmentView, so this value
      // is exactly what a refetch would produce.
      qc.setQueryData(['enrollment', 'me'], enrollment);
      // Prefix invalidation so today's workout is re-derived for the new program.
      qc.invalidateQueries({ queryKey: ['enrollment'] });
    },
  });
}
