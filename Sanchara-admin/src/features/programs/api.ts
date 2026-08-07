import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';

/**
 * Programs API — the clinical portal's authoring surface.
 *
 * Content is 4-level: Program → Level → Day → Exercises.
 *
 * NOTE: the portal reads via `/programs/admin*`, NOT the patient-facing
 * `/programs`. The latter sits behind `requireActiveAccess` (a patient gate that
 * rejects staff tokens) and hides unpublished drafts.
 */
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ProgramType = 'STANDARD' | 'ASSIGNED' | 'CUSTOM' | 'SHORT';

export interface ProgramRow {
  id: string;
  name?: string;
  description?: string;
  type: ProgramType;
  durationDays?: number;
  /** Raw stored value (storage key, or absolute URL for seeded content). */
  thumbnailUrl?: string;
  /** Ready for <img src> — resolves keys and passes absolute URLs through. */
  thumbnailImageUrl: string | null;
  difficultyLevel?: Difficulty;
  goalTag: string[];
  suitableConditions: string[];
  targetAreas: string[];
  ageGroups: string[];
  isPublished: boolean;
  isActive: boolean;
  levelCount: number;
  dayCount: number;
  updatedAt: string;
}

export interface DayExercise {
  exerciseId: string;
  order: number;
  sets?: number;
  notes?: string;
  title?: string;
  difficulty?: Difficulty;
  /** False when the exercise is no longer APPROVED — patients never see it. */
  playable: boolean;
}

export interface AdminDay {
  id: string;
  levelNumber?: number;
  dayNumber: number;
  title?: string;
  description?: string;
  isRestDay: boolean;
  estimatedDurationSeconds?: number;
  exercises: DayExercise[];
  /** How many of `exercises` the patient will NOT be shown. 0 when healthy. */
  unavailableCount: number;
}

export interface AdminLevel {
  id: string;
  levelNumber: number;
  title?: string;
  description?: string;
  dayCount: number;
  days: AdminDay[];
}

export interface ProgramDetail extends ProgramRow {
  levels: AdminLevel[];
  /** Days with no level — flat programs (e.g. SHORT). */
  days: AdminDay[];
}

export interface ProgramListParams {
  search?: string;
  type?: ProgramType;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}

interface Paged<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useProgramList(params: ProgramListParams) {
  return useQuery({
    queryKey: ['programs', 'admin', params],
    queryFn: async () => {
      const { data } = await api.get<Paged<ProgramRow>>('/programs/admin', { params });
      return data;
    },
  });
}

export function useProgramDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['programs', 'admin', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<{ program: ProgramDetail }>(`/programs/admin/${id}`);
      return data.program;
    },
  });
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  type: ProgramType;
  durationDays?: number;
  /** Storage key returned by useUploadProgramThumbnail. */
  thumbnailUrl?: string;
  difficultyLevel?: Difficulty;
  goalTag: string[];
  suitableConditions: string[];
  targetAreas: string[];
  ageGroups: string[];
}

/**
 * Upload a cover image first — the backend returns a STORAGE KEY which is then
 * saved on the program. Content-Type is cleared so the browser sets the
 * multipart boundary itself.
 */
export function useUploadProgramThumbnail() {
  return useMutation({
    mutationFn: async (image: File) => {
      const form = new FormData();
      form.append('image', image);
      const { data } = await api.post<{ thumbnailStorageKey: string }>(
        '/programs/thumbnail',
        form,
        { headers: { 'Content-Type': undefined }, timeout: 60_000 },
      );
      return data.thumbnailStorageKey;
    },
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProgramInput) => {
      const { data } = await api.post<{ program: ProgramRow }>('/programs', input);
      return data.program;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}

export function useUpdateProgram(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreateProgramInput> & { isActive?: boolean }) => {
      const { data } = await api.patch<{ program: ProgramRow }>(`/programs/${id}`, input);
      return data.program;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}

/** Publishing is what makes a program visible to patients — hence its own endpoint. */
export function useSetPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { data } = await api.patch<{ program: ProgramRow }>(`/programs/${id}/publish`, {
        isPublished,
      });
      return data.program;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}

// ── Levels ────────────────────────────────────────────────────────────────────
export function useCreateLevel(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { levelNumber: number; title?: string; description?: string }) => {
      const { data } = await api.post<{ level: AdminLevel }>(
        `/programs/${programId}/levels`,
        input,
      );
      return data.level;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}

export function useDeleteLevel(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (levelId: string) => {
      await api.delete(`/programs/${programId}/levels/${levelId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}

// ── Days ──────────────────────────────────────────────────────────────────────
export interface CreateDayInput {
  levelNumber?: number;
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  exercises: { exercise: string; order: number; sets?: number }[];
}

export function useCreateDay(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDayInput) => {
      const { data } = await api.post<{ day: AdminDay }>(`/programs/${programId}/days`, input);
      return data.day;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}

export function useDeleteDay(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dayId: string) => {
      await api.delete(`/programs/${programId}/days/${dayId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}

// ── Exercises (for the day builder's picker) ──────────────────────────────────
export interface ExerciseOption {
  id: string;
  title: string;
  description?: string;
  difficulty: Difficulty;
  durationSeconds: number;
  areaTag: string[];
  isWarmup: boolean;
  isCooldown: boolean;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  thumbnailPlaybackUrl: string | null;
  playbackUrl: string | null;
}

/**
 * Library exercises for composing a day.
 *
 * Uses the STAFF endpoint, not the public one: the picker needs thumbnails and
 * approval status. Only APPROVED items are offered — putting a pending or
 * rejected video into a patient's day would bypass the review gate.
 */
export function useExerciseOptions(search: string) {
  return useQuery({
    queryKey: ['exercises', 'options', search],
    queryFn: async () => {
      const { data } = await api.get<{ data: ExerciseOption[] }>('/exercises/admin', {
        params: { limit: 100, status: 'APPROVED', ...(search ? { search } : {}) },
      });
      return data.data;
    },
  });
}
