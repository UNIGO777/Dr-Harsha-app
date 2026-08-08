/**
 * Sanchara design tokens — LIGHT + DARK.
 *
 * Two consumers, kept in sync:
 *
 *  1. NativeWind classes (`bg-base`, `text-primary`, …). Those resolve through
 *     CSS variables declared in `global.css`, which `tailwind.config.js` maps
 *     onto colour names. Switching theme flips the variables, so no component
 *     needs a `dark:` prefix.
 *
 *  2. Native APIs that can't take a className — SVG fills, icon colours,
 *     placeholderTextColor, StatusBar. Those read the palette at runtime via
 *     `useThemeColors()`; never import a palette directly in a component or it
 *     will not react to a theme change.
 *
 * Aesthetic: calm and clinical, users aged 30–60, high legibility in both modes.
 */

export interface Palette {
  /** App background. */
  base: string;
  /** Cards / raised surfaces. */
  surface: string;
  /** Text-input fill. */
  inputFill: string;
  /** Primary text. */
  textPrimary: string;
  /** Secondary / supporting text. */
  textSecondary: string;
  /** Uppercase, letter-spaced micro labels. */
  microLabel: string;
  /** Brand accent — buttons, active/focus, logo mark, highlights. */
  accent: string;
  /** Brighter accent tint for gradients / glows. */
  accentHi: string;
  /** Text used ON accent fills. */
  accentText: string;
  /** Warm accent — the "heart" of the ring, wallet meta. */
  amber: string;
  /** Tertiary tint, used sparingly. */
  peri: string;
  /** Muted red — safety warnings ONLY. */
  danger: string;
  /** Hairline borders / dividers. */
  border: string;
}

export const darkColors: Palette = {
  base: '#0B0B0C',
  surface: '#161618',
  inputFill: '#1C1C1F',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8BE',
  microLabel: '#9A9AA0',
  accent: '#4FE0AC',
  accentHi: '#7BF0C8',
  accentText: '#0B0B0C',
  amber: '#F5C46B',
  peri: '#8B9BF0',
  danger: '#E5675F',
  border: '#26262A',
};

/**
 * Light palette. Not a naive inversion: the accent is darkened so it still
 * passes contrast on white (mint on white is unreadable at the dark value),
 * and accentText flips to near-black-on-mint staying legible.
 */
export const lightColors: Palette = {
  base: '#FAFAF8',
  surface: '#FFFFFF',
  inputFill: '#F2F2F0',
  textPrimary: '#111214',
  textSecondary: '#54565C',
  microLabel: '#75777E',
  accent: '#0E9E74',
  accentHi: '#0B8A64',
  accentText: '#FFFFFF',
  amber: '#B5761A',
  peri: '#4A5BC0',
  danger: '#C4453C',
  border: '#E4E4E2',
};

/** Kept for non-React code paths that need a concrete default (e.g. splash). */
export const colors = darkColors;

export type ThemeName = 'light' | 'dark';

export const palettes: Record<ThemeName, Palette> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * Colours for content sitting ON a photograph. Deliberately theme-INDEPENDENT:
 * a scrim has to beat the photo, not the page, so it stays dark in light mode
 * too — and therefore the text on top of it stays light in both modes. Using
 * `textPrimary` here would turn near-black on a dark scrim in light mode.
 */
export const onImage = {
  scrimTop: 'rgba(11,11,12,0.15)',
  scrimMid: 'rgba(11,11,12,0.55)',
  scrimBottom: 'rgba(11,11,12,0.96)',
  chipFill: 'rgba(11,11,12,0.55)',
  textPrimary: '#FFFFFF',
  textSecondary: '#D3D3D9',
  accent: '#4FE0AC',
} as const;

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * The palette as CSS custom properties, for NativeWind's `vars()`.
 *
 * Values are space-separated RGB channels (NOT hex) because the Tailwind config
 * declares colours as `rgb(var(--color-x) / <alpha-value>)` — that slot is what
 * makes `bg-accent/12` work, and it only accepts bare channels.
 *
 * Applied to a root View in app/_layout.tsx. This is what actually drives the
 * theme: `.dark:root` in global.css is only the pre-mount fallback, because
 * NativeWind's own class-based dark mode cannot be toggled at runtime on this
 * React Native version — see the note in useTheme.ts.
 */
export function themeVars(palette: Palette): Record<string, string> {
  const asVar = (hex: string) => channels(hex).join(' ');
  return {
    '--color-base': asVar(palette.base),
    '--color-surface': asVar(palette.surface),
    '--color-input-fill': asVar(palette.inputFill),
    '--color-primary': asVar(palette.textPrimary),
    '--color-secondary': asVar(palette.textSecondary),
    '--color-micro': asVar(palette.microLabel),
    '--color-accent': asVar(palette.accent),
    '--color-accent-hi': asVar(palette.accentHi),
    '--color-accent-text': asVar(palette.accentText),
    '--color-amber': asVar(palette.amber),
    '--color-peri': asVar(palette.peri),
    '--color-danger': asVar(palette.danger),
    '--color-border': asVar(palette.border),
  };
}

/**
 * Translucent tint from a palette hex — for soft icon chips and scrims that need
 * to follow the active theme instead of a baked-in rgba string.
 */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
 *
 * ONE family — Inter — across the whole app. The `display` tier is kept as a
 * separate name because it carries meaning ("this is a heading") in ~44 places;
 * it just resolves to Inter now rather than a display serif. Changing the
 * headline face later is a one-line edit here plus the matching tailwind block.
 */
export const fonts = {
  /** Headline tier — same face as the UI text, distinguished by weight/size. */
  display: 'Inter',
  displaySemiBold: 'Inter-SemiBold',
  displayBold: 'Inter-Bold',
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

export type Colors = Palette;
export type ColorToken = keyof Palette;
