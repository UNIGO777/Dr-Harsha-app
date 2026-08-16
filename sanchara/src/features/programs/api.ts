/**
 * Programs API — React Query reads over the shared axios instance. Mirrors the
 * backend programs module DTOs (M2.5). Program detail deliberately carries NO
 * video URLs (browse only).
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ProgramType = 'STANDARD' | 'ASSIGNED' | 'CUSTOM' | 'SHORT';

export interface ProgramSummary {
  id: string;
  name?: string;
  description?: string;
  type: ProgramType;
  durationDays?: number;
  thumbnailUrl?: string;
  /** Server-resolved cover URL. Prefer this over `thumbnailUrl`, which is a raw storage key. */
  thumbnailImageUrl?: string | null;
  difficultyLevel?: Difficulty;
  goalTag: string[];
  suitableConditions: string[];
  targetAreas: string[];
  ageGroups: string[];
  isPublished: boolean;
}

export interface DaySummary {
  /** ProgramDay id — required by POST /sessions/start. */
  id: string;
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  exerciseCount: number;
}

/** One difficulty tier inside a program: Program → Level → Day → Exercises. */
export interface PublicLevel {
  levelNumber: number;
  title?: string;
  description?: string;
  dayCount: number;
  days: DaySummary[];
}

export interface ProgramDetail extends ProgramSummary {
  dayCount: number;
  totalLevels: number;
  levels: PublicLevel[];
  /** Flat day list — populated only for level-less programs (e.g. SHORT). */
  days: DaySummary[];
}

export interface Recommendation {
  program: ProgramSummary;
  score: number;
  matchReason: string;
}

export interface ProgramFilters {
  goalTag?: string;
  targetAreas?: string;
  difficultyLevel?: Difficulty;
  /** Defaults to STANDARD server-side; pass 'SHORT' for standalone quick sessions. */
  type?: ProgramType;
  /** Case-insensitive match on the programme NAME (not description). Applied
   *  server-side, so it searches every programme rather than only the pages
   *  already fetched. */
  search?: string;
}

export function useRecommendedPrograms() {
  return useQuery({
    queryKey: ['programs', 'recommended'],
    queryFn: async () => {
      const { data } = await api.get<{ recommendations: Recommendation[] }>(
        endpoints.programs.recommended,
      );
      return data.recommendations;
    },
  });
}

interface PagedPrograms {
  data: ProgramSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Paginated program list — loaded in chunks as the user scrolls (infinite
 * scroll) rather than all at once. `pageSize` is the chunk size.
 */
export function useProgramsInfinite(pageSize = 12, filters?: ProgramFilters) {
  return useInfiniteQuery({
    queryKey: ['programs', 'infinite', pageSize, filters ?? {}],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<PagedPrograms>(endpoints.programs.list, {
        params: { page: pageParam, limit: pageSize, ...filters },
      });
      return data;
    },
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}

/**
 * Standalone SHORT programs — the "only got 5 minutes?" row. These never touch
 * enrollment progress but their minutes still count toward the weekly target.
 */
export function useShortPrograms(limit = 8) {
  return useQuery({
    queryKey: ['programs', 'short', limit],
    queryFn: async () => {
      const { data } = await api.get<PagedPrograms>(endpoints.programs.list, {
        params: { type: 'SHORT', limit },
      });
      return data.data;
    },
  });
}

export function useProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['program', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<{ program: ProgramDetail }>(endpoints.programs.byId(id!));
      return data.program;
    },
  });
}
