# Sanchara — Mobile Frontend

React Native (Expo) frontend for **Sanchara**, a medically-supervised exercise
app. Dark-mode only, cinematic/premium UI, users aged 30–60. Talks to a separate
Node/MongoDB backend (phone-OTP auth, 13-field onboarding, exercise library,
session engine) that lives in `../restore-move`.

> **Expo has changed.** This project is on **SDK 57**. Always check the versioned
> docs at https://docs.expo.dev/versions/v57.0.0/ before adding code — several
> APIs (New Architecture, expo-router ↔ react-navigation decoupling, expo-video)
> differ from older tutorials.

## Tech stack

- **Runtime:** Expo SDK **57**, React Native 0.86, React 19.2 — **New Architecture
  only** (legacy renderer was removed in SDK 55; nothing to toggle).
- **Language:** TypeScript **strict** (matches the backend).
- **Dev workflow:** `expo-dev-client` (custom dev build) — **not** Expo Go, because
  we use native modules (video, reanimated, secure-store).

## Libraries & why

| Area | Package | Purpose |
| --- | --- | --- |
| Routing | `expo-router` | File-based routes (stack for auth/onboarding, tabs for app) |
| | `react-native-screens`, `react-native-safe-area-context` | Native screens + notch insets |
| Styling | `nativewind` + `tailwindcss@3` | Tailwind utility classes on RN (web-first DX) |
| | `expo-linear-gradient` | Cinematic bottom scrims over full-bleed images |
| | `react-native-svg` | Body-map, charts, icons |
| | `expo-image` | Performant full-bleed background images |
| Fonts | `expo-font`, `@expo-google-fonts/fraunces`, `@expo-google-fonts/inter` | Fraunces (display serif) + Inter (UI sans) |
| Server state | `@tanstack/react-query` | API caching / server state |
| Client state | `zustand` | Auth session + onboarding draft |
| HTTP | `axios` | Single configured instance w/ JWT interceptor |
| Secure storage | `expo-secure-store` | JWT in the keychain/keystore (never AsyncStorage) |
| Forms | `react-hook-form` + `zod` | 13-field onboarding + auth, mirrors backend rules |
| Motion | `react-native-reanimated` (+ `react-native-worklets`), `react-native-gesture-handler` | Transitions, progress ring, scrim fades |
| Haptics | `expo-haptics` | Subtle feedback on selections/OTP |
| Media | `expo-video` | HLS playback (Bunny.net), fullscreen portrait — later phase |
| Icons | `lucide-react-native` | Minimal line icons |

### Deferred (NOT installed yet — add when the feature lands)

- `expo-notifications` — push / session reminders
- `react-native-health-connect` — Android wearable/health data (Phase 2)
- `victory-native` **or** `react-native-gifted-charts` — progress/trend charts

## Project structure

```
sanchara/
├── app/                     # expo-router routes
│   ├── _layout.tsx          # providers + font gate (splash until fonts load)
│   ├── index.tsx            # placeholder landing (theme + fonts + Button demo)
│   ├── (auth)/              # phone-entry, otp
│   ├── (onboarding)/        # welcome … success (11 steps)
│   └── (app)/(tabs)/        # home, library, progress, profile
├── src/
│   ├── theme/               # tokens.ts (colors/spacing/radius/fonts), fonts.ts
│   ├── components/ui/       # Button, Input, OtpInput, ProgressBar, Chip, Card
│   ├── features/            # auth/, onboarding/, session/ (hooks + logic)
│   ├── api/                 # client.ts (axios), endpoints.ts, queryClient.ts, hooks/
│   ├── store/               # authStore, onboardingStore (zustand)
│   ├── lib/                 # bmi, validators (age 30–60 gate), formatters, secureStore
│   └── types/               # shared TS types (mirror backend models)
├── tailwind.config.js       # dark tokens as utility classes (mirrors theme/tokens.ts)
├── global.css               # @tailwind directives (NativeWind entry)
├── babel.config.js          # babel-preset-expo (jsxImportSource: nativewind) + nativewind/babel
├── metro.config.js          # withNativeWind(input: ./global.css)
└── nativewind-env.d.ts      # className typing + *.css module decl
```

## Design tokens (dark only)

Source of truth: `src/theme/tokens.ts`, mirrored into `tailwind.config.js`.

| Token | Value | Utility class |
| --- | --- | --- |
| base (bg) | `#0B0B0C` | `bg-base` |
| surface | `#161618` | `bg-surface` |
| inputFill | `#1C1C1F` | `bg-input-fill` |
| textPrimary | `#FFFFFF` | `text-primary` |
| textSecondary | `#B8B8BE` | `text-secondary` |
| microLabel | `#9A9AA0` | `text-micro` |
| accent | `#69D1C0` | `bg-accent` / `text-accent` |
| accentText | `#0B0B0C` | `text-accent-text` |
| danger (muted) | `#E5675F` | `text-danger` (safety warnings only) |

Buttons are full-width **pills**, ~60px tall, accent fill with near-black label.
Fonts: `font-display*` = Fraunces, `font-sans*` = Inter.

## Setup

```bash
# 1. Env
cp .env.example .env         # set EXPO_PUBLIC_API_URL to the backend

# 2. Install
npm install

# 3. Build & run the dev client on a device/emulator (first build is slow)
npx expo run:android         # requires a connected device or booted emulator
# JS-only reloads after that:
npx expo start --dev-client
```

`EXPO_PUBLIC_API_URL` — Android emulator reaches the host via `10.0.2.2`
(not `localhost`); a physical device needs your machine's LAN IP.

## Scripts

| Script | Description |
| --- | --- |
| `npx expo start --dev-client` | Metro dev server for the custom dev build |
| `npx expo run:android` | Prebuild + gradle build + install + launch |
| `npm run lint` | ESLint (expo config) |
| `npx tsc --noEmit` | Strict type-check |
| `npx expo-doctor` | Config/version sanity checks |
