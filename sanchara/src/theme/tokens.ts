/**
 * Sanchara design tokens — DARK MODE ONLY.
 *
 * This file is the single source of truth for the visual language. The same
 * values are mirrored into `tailwind.config.js` so they are available both as
 * NativeWind utility classes (e.g. `bg-base`, `text-primary`, `bg-accent`) and
 * as plain values for native APIs that can't take a className (SplashScreen
 * background, StatusBar, react-navigation theme, react-native-svg fills, etc).
 *
 * Aesthetic: cinematic / premium, users aged 30–60, high legibility.
 */

export const colors = {
  /** App background (near-black). */
  base: '#0B0B0C',
  /** Cards / raised surfaces. */
  surface: '#161618',
  /** Text-input fill. */
  inputFill: '#1C1C1F',
  /** Primary text. */
  textPrimary: '#FFFFFF',
  /** Secondary / supporting text. */
  textSecondary: '#B8B8BE',
  /** Uppercase, letter-spaced micro labels. */
  microLabel: '#9A9AA0',
  /** Brand accent — buttons, active/focus, logo mark, highlights. */
  accent: '#4FE0AC',
  /** Brighter accent tint for gradient highlights / glows. */
  accentHi: '#7BF0C8',
  /** Near-black text used ON accent fills. */
  accentText: '#0B0B0C',
  /**
   * Warm accent — the "heart" of the instrument. Ring's outer arc, wallet
   * balance meta, one quick-session tile. Never for destructive meaning.
   */
  amber: '#F5C46B',
  /** Tertiary tint — used sparingly (a single quick-session tile). */
  peri: '#8B9BF0',
  /** Muted red — safety warnings ONLY, used sparingly. */
  danger: '#E5675F',
  /** Hairline borders / dividers on dark surfaces. */
  border: '#26262A',
} as const;

/** Corner radii. Inputs/cards 16–20px, buttons are full pills. */
export const radius = {
  input: 16,
  card: 20,
  button: 9999,
} as const;

/** 4pt spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

/**
 * Font family names. These strings are the keys we register with expo-font in
 * the root layout, and they match the `fontFamily` utilities in tailwind.config.
 */
export const fonts = {
  /** Fraunces — display serif: headlines, wordmark, numbers. */
  display: 'Fraunces',
  displaySemiBold: 'Fraunces-SemiBold',
  displayBold: 'Fraunces-Bold',
  /** Inter — UI sans: labels, inputs, buttons, meta. */
  ui: 'Inter',
  uiMedium: 'Inter-Medium',
  uiSemiBold: 'Inter-SemiBold',
  uiBold: 'Inter-Bold',
} as const;

/** Primary CTA button geometry — full-width accent pill. */
export const button = {
  height: 60,
} as const;

export type Colors = typeof colors;
export type ColorToken = keyof Colors;
