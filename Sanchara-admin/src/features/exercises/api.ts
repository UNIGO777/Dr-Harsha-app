import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { Difficulty } from '@/features/programs/api';

/**
 * Exercises API — the video library.
 *
 * Reads use `/exercises/admin`, NOT the public `/exercises`: the latter hides
 * pending/rejected/clinical-exclusive items and strips video URLs for anyone
 * who isn't an entitled patient.
 */
export type ExerciseStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type GenderFilter = 'all' | 'male' | 'female';

export interface Exercise {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  difficulty: Difficulty;
  goalTag: string[];
  areaTag: string[];
  genderFilter: GenderFilter;
  isWarmup: boolean;
  isCooldown: boolean;
  clinicalExclusive: boolean;
  status: ExerciseStatus;
  uploadedBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  /** Resolved through the video service — safe to play; never the raw key. */
  playbackUrl: string | null;
}

export interface ExerciseListParams {
  search?: string;
  status?: ExerciseStatus;
  difficulty?: Difficulty;
  areaTag?: string;
  page?: number;
  limit?: number;
}

interface ExerciseListResponse {
  data: Exercise[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  statusCounts: Record<ExerciseStatus, number>;
}

export function useExerciseList(params: ExerciseListParams) {
  return useQuery({
    queryKey: ['exercises', 'admin', params],
    queryFn: async () => {
      const { data } = await api.get<ExerciseListResponse>('/exercises/admin', { params });
      return data;
    },
  });
}

/** ADMIN-only approval queue. */
export function usePendingExercises() {
  return useQuery({
    queryKey: ['exercises', 'pending'],
    queryFn: async () => {
      const { data } = await api.get<{ exercises: Exercise[] }>('/exercises/admin/pending');
      return data.exercises;
    },
  });
}

export interface UploadResult {
  videoStorageKey: string;
  thumbnailStorageKey?: string;
}

/**
 * Upload the media first — the backend returns STORAGE KEYS, which are then
 * saved as the exercise's videoUrl/thumbnailUrl. Content-Type is deleted so the
 * browser sets the multipart boundary itself.
 */
export function useUploadVideo() {
  return useMutation({
    mutationFn: async ({ video, thumbnail }: { video: File; thumbnail?: File }) => {
      const form = new FormData();
      form.append('video', video);
      if (thumbnail) form.append('thumbnail', thumbnail);
      const { data } = await api.post<UploadResult>('/exercises/upload-video', form, {
        headers: { 'Content-Type': undefined },
        timeout: 120_000, // videos are large; the default 15s isn't enough
      });
      return data;
    },
  });
}

export interface CreateExerciseInput {
  title: string;
  description?: string;
  videoUrl: string; // storage key from useUploadVideo
  thumbnailUrl?: string;
  durationSeconds: number;
  difficulty: Difficulty;
  goalTag: string[];
  areaTag: string[];
  genderFilter: GenderFilter;
  isWarmup: boolean;
  isCooldown: boolean;
  clinicalExclusive: boolean;
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      const { data } = await api.post<{ exercise: Exercise }>('/exercises', input);
      return data.exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateExerciseInput> & { id: string }) => {
      const { data } = await api.patch<{ exercise: Exercise }>(`/exercises/${id}`, input);
      return data.exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

/** ADMIN only — both actions are written to the immutable audit log. */
export function useApproveExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<{ exercise: Exercise }>(`/exercises/${id}/approve`);
      return data.exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

export function useRejectExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: string; rejectionReason: string }) => {
      const { data } = await api.patch<{ exercise: Exercise }>(`/exercises/${id}/reject`, {
        rejectionReason,
      });
      return data.exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}
