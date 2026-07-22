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
  currentDay: number;
  completedDays: number[];
  totalDays?: number;
  percentComplete: number;
  startedAt?: string;
  completedAt?: string;
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
