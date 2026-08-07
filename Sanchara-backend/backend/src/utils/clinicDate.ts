import { env } from '../config/env';

/**
 * Calendar-day helpers for the one-session-per-day rule.
 *
 * "Today" has to mean the patient's day, not the server's. The process may run
 * in UTC, where the date rolls over at 05:30 IST — right in the middle of a
 * patient's morning — so every boundary here is computed in the clinic's own
 * timezone (env.CLINIC_TIMEZONE).
 *
 * Dates are handled as plain YYYY-MM-DD strings rather than Date objects: the
 * rule is about calendar days, not instants, and a string can't drift when it
 * is stored, compared, or serialised to the client.
 */

/** YYYY-MM-DD for the given instant in the clinic's timezone. */
export function clinicDateString(date: Date = new Date()): string {
  // 'en-CA' formats as YYYY-MM-DD, which sorts and compares lexicographically.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** The calendar day after `dateString` (YYYY-MM-DD in, YYYY-MM-DD out). */
export function nextClinicDate(dateString: string): string {
  // Parsed as UTC midnight so the +1 day can't be nudged by a DST transition
  // in the local zone; only the calendar arithmetic matters here.
  const [y, m, d] = dateString.split('-').map(Number);
  const next = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1));
  return next.toISOString().slice(0, 10);
}
