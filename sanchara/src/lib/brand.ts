/**
 * Brand + legal constants. Single source of truth so the clinic name and the
 * Terms / Privacy ordering stay identical across every screen.
 */
export const BRAND = {
  centre: "Dr. Harsha KJ's Lifestyle & Prevention Centre",
  /** Default dialing code (India). */
  countryCode: '+91',
} as const;

/** Legal links — keep this order (Terms first, then Privacy Policy) everywhere. */
export const LEGAL_LINKS = [
  { label: 'Terms', href: 'https://sanchara.app/terms' },
  { label: 'Privacy Policy', href: 'https://sanchara.app/privacy' },
] as const;
