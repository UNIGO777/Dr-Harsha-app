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

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, switchExisting }: { programId: string; switchExisting?: boolean }) => {
      const { data } = await api.post<{ enrollment: EnrollmentView }>(
        endpoints.enrollments.root,
        { programId },
        { params: switchExisting ? { switch: true } : undefined },
      );
      return data.enrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollment', 'me'] });
    },
  });
}
