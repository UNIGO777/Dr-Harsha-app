import { api } from '@/api/client';

/**
 * Staff auth — mirrors the backend `/staff/auth` module.
 *
 * Staff authenticate with email + password (+ TOTP when enrolled), which is a
 * different flow from patients (phone + OTP). The tokens carry role
 * CLINICAL_STAFF or ADMIN, which is what gates the management endpoints.
 */
export type StaffRole = 'CLINICAL_STAFF' | 'ADMIN';

export interface StaffProfile {
  id: string;
  email: string;
  name?: string;
  role: StaffRole;
  isActive: boolean;
  totpEnabled: boolean;
  assignedPatientCount: number;
  lastLoginAt?: string;
}

/** The account has 2FA enrolled and the UI must now collect a code. */
interface LoginTotpRequired {
  success: true;
  totpRequired: true;
  message: string;
}

interface LoginSuccess {
  success: true;
  totpRequired: false;
  staff: StaffProfile;
  accessToken: string;
  refreshToken: string;
}

export type LoginResponse = LoginTotpRequired | LoginSuccess;

export async function login(input: {
  email: string;
  password: string;
  totpCode?: string;
}): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/staff/auth/login', input);
  return data;
}

export async function fetchMe(): Promise<StaffProfile> {
  const { data } = await api.get<{ staff: StaffProfile }>('/staff/auth/me');
  return data.staff;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/staff/auth/logout', { refreshToken });
}
