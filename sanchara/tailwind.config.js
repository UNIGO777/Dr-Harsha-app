/** @type {import('tailwindcss').Config} */
// Sanchara — dark-mode-only design system.
// Values here MIRROR src/theme/tokens.ts. Because the app is dark-only, the dark
// values ARE the defaults (there is no light variant), so `bg-base`, `text-primary`,
// `bg-accent`, etc. resolve to the cinematic dark palette everywhere.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: '#0B0B0C',
        surface: '#161618',
        'input-fill': '#1C1C1F',
        border: '#26262A',
        primary: '#FFFFFF', // text-primary
        secondary: '#B8B8BE', // text-secondary
        micro: '#9A9AA0', // micro labels
        accent: '#4FE0AC',
        'accent-hi': '#7BF0C8',
        'accent-text': '#0B0B0C',
        amber: '#F5C46B',
        peri: '#8B9BF0',
        danger: '#E5675F',
      },
      fontFamily: {
        // display serif (Fraunces)
        display: ['Fraunces'],
        'display-semibold': ['Fraunces-SemiBold'],
        'display-bold': ['Fraunces-Bold'],
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
