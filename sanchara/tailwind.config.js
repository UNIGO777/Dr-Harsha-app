/** @type {import('tailwindcss').Config} */
// Sanchara — light + dark design system.
//
// Colours resolve through CSS variables. global.css holds the pre-mount
// defaults; the live values come from `vars()` on the root View in
// app/_layout.tsx (see src/theme/useTheme.ts). Either way classes like
// `bg-base` / `text-primary` flip on their own — no `dark:` prefixes anywhere.
//
// Channels are space-separated RGB so `<alpha-value>` works — that's what makes
// `bg-accent/12` and `border-accent/30` render correctly.
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--color-base) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'input-fill': 'rgb(var(--color-input-fill) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)', // text-primary
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)', // text-secondary
        micro: 'rgb(var(--color-micro) / <alpha-value>)', // micro labels
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-hi': 'rgb(var(--color-accent-hi) / <alpha-value>)',
        'accent-text': 'rgb(var(--color-accent-text) / <alpha-value>)',
        amber: 'rgb(var(--color-amber) / <alpha-value>)',
        peri: 'rgb(var(--color-peri) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      fontFamily: {
        // Headline tier — same face as the body text, separated by weight/size.
        // Kept as its own utility name so the ~44 `font-display-*` usages still
        // say "heading" and can be re-pointed at another face in one place.
        display: ['Inter'],
        'display-semibold': ['Inter-SemiBold'],
        'display-bold': ['Inter-Bold'],
        // UI sans (Inter)
        sans: ['Inter'],
        'sans-medium': ['Inter-Medium'],
        'sans-semibold': ['Inter-SemiBold'],
        'sans-bold': ['Inter-Bold'],
      },
      borderRadius: {
        input: '16px',
        card: '20px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
