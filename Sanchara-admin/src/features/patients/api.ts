import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';

/**
 * Patients API — the clinical portal's view of patient records.
 *
 * ADMIN sees everyone; CLINICAL_STAFF only sees their assigned patients. That
 * is enforced server-side by narrowing the query, so this layer needs no
 * role logic — an out-of-scope patient simply 404s.
 */
export type AccountStatus = 'active' | 'waitlisted' | 'locked';
export type UserGroup = 'GROUP_1' | 'GROUP_2' | 'WAITLIST';

export interface PatientRow {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  group?: UserGroup;
  level: number;
  accountStatus: AccountStatus;
  trialEndDate?: string;
  painAreas: string[];
  createdAt: string;
}

export interface PatientEnrollment {
  id: string;
  programId: string;
  program: { id: string; name?: string; durationDays?: number } | null;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ABANDONED';
  currentLevel: number;
  currentDay: number;
  completedDays: number[];
  completedLevels: number[];
  totalLevels: number;
  totalDays?: number;
  percentComplete: number;
  startedAt?: string;
}

export interface PatientSession {
  id: string;
  date?: string;
  levelNumber?: number;
  dayNumber?: number;
  durationSeconds: number;
  completion?: 'COMPLETED' | 'PARTIAL' | 'SKIPPED';
  avgEaseScore?: number;
  programType?: string;
}

export interface PatientDetail extends PatientRow {
  conditions: string[];
  surgeryHistory?: string;
  goal?: string;
  exerciseHistory?: string;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  maxHr?: number;
  trialStartDate?: string;
  weeklyActivity: { currentMinutes: number; weekStartDate?: string };
  enrollment: PatientEnrollment | null;
  recentSessions: PatientSession[];
  trends: {
    painByArea: Record<string, { date?: string; score: number }[]>;
    easeTrajectory: { date?: string; avgEaseScore: number }[];
  };
  /** Sessions started despite a high pain score — clinically significant. */
  safetyOverrides: { at: string; reason?: string; maxScore?: number }[];
}

export interface PatientListParams {
  search?: string;
  accountStatus?: AccountStatus;
  group?: UserGroup;
  page?: number;
  limit?: number;
}

interface PatientListResponse {
  data: PatientRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  statusCounts: Record<AccountStatus, number>;
}

export function usePatientList(params: PatientListParams) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: async () => {
      const { data } = await api.get<PatientListResponse>('/staff/patients', { params });
      return data;
    },
  });
}

export function usePatientDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['patients', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<{ patient: PatientDetail }>(`/staff/patients/${id}`);
      return data.patient;
    },
  });
}

/**
 * Block / unblock a patient, or approve one off the waitlist.
 *
 * A reason is mandatory — the backend records it in the immutable audit log,
 * because blocking cuts the patient off from their prescribed exercise.
 */
export function useSetPatientStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountStatus,
      reason,
    }: {
      accountStatus: AccountStatus;
      reason: string;
    }) => {
      const { data } = await api.patch<{ patient: PatientRow }>(
        `/staff/patients/${id}/status`,
        { accountStatus, reason },
      );
      return data.patient;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}
