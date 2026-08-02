/**
 * Token persistence for the portal.
 *
 * Stored in localStorage so a refresh doesn't log staff out. That is a
 * deliberate trade-off: it's readable by any XSS on this origin. The stronger
 * option is httpOnly cookies, which needs a backend change (Set-Cookie + CSRF
 * protection) — worth doing before this portal handles real patient data.
 *
 * TODO(security): move staff tokens to httpOnly, SameSite=Strict cookies.
 */
const ACCESS_KEY = 'sanchara.staff.access';
const REFRESH_KEY = 'sanchara.staff.refresh';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
