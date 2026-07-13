/**
 * Small presentation helpers shared across screens. Pure functions, no UI.
 */

/** "9876543210" -> "+91 98765 43210"-ish grouping for display (best-effort). */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 5) return phone;
  const last10 = digits.slice(-10);
  const cc = digits.slice(0, -10);
  const grouped = `${last10.slice(0, 5)} ${last10.slice(5)}`;
  return cc ? `+${cc} ${grouped}` : grouped;
}

/** Seconds -> "M:SS", used for OTP resend timers and session clocks. */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Capitalise the first letter — for enum-ish labels. */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
