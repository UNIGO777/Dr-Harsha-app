# Sanchara — Clinical Portal

Web admin panel for **Sanchara**, used by clinical staff and administrators to
manage patients, programs and exercise content. Companion to the patient mobile
app (`../sanchara`) and the API (`../Sanchara-backend`).

## Stack

- **Vite 8** + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — config lives in `src/index.css` under `@theme` (no `tailwind.config.js`)
- **React Router** (routing) · **Zustand** (session) · **Axios** (API) · **lucide-react** (icons)

## Prerequisites

The API must be running (see `../Sanchara-backend/backend`) with staff accounts seeded:

```bash
cd ../Sanchara-backend/backend
npm run seed:staff     # creates the two dev accounts below
npm run dev
```

## Setup

```bash
npm install
cp .env.example .env    # only needed if your backend isn't on :5000
npm run dev             # http://localhost:5173
```

In dev, `/api/*` is proxied to the backend (see `vite.config.ts`), so the browser
stays same-origin and no CORS configuration is required.

> **macOS:** port 5000 is taken by the AirPlay Receiver. If you run the backend on
> another port, set `VITE_API_PROXY=http://localhost:5055` in `.env`.

## Dev accounts

Created by `npm run seed:staff` in the backend. **Dev only** — never seed these in production.

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@sanchara.test` | `Admin@12345` |
| CLINICAL_STAFF | `clinician@sanchara.test` | `Clinic@12345` |

## Auth

Staff sign in with **email + password**, plus a **TOTP** code when their account has
2FA enrolled (patients use phone + OTP in the mobile app instead). Tokens carry
role `CLINICAL_STAFF` or `ADMIN`, which is what the backend's `requireRole`
middleware gates management endpoints on.

- Access token: 15 min · refresh token: 7 days, rotated and revocable server-side
- A 401 triggers one silent refresh + retry; only if that fails is the session dropped
- Role-based nav hides what a clinician can't use — **the backend enforces the same
  rules independently**, so hiding a link is never the security boundary

⚠️ Tokens are currently in `localStorage` (see `src/lib/session.ts`). Before this
portal handles real patient data, move them to httpOnly cookies — that needs a
backend change (Set-Cookie + CSRF protection).

## Structure

```
src/
├── api/client.ts          # axios instance, silent refresh, error helper
├── lib/session.ts         # token persistence
├── features/auth/         # staff auth API + zustand session store
├── components/            # AppShell (sidebar), PageHeader
├── routes/                # LoginPage, OverviewPage, PlaceholderPage
├── App.tsx                # router + RequireAuth / RequireAdmin guards
└── index.css              # Tailwind v4 theme tokens
```

## Status

Built: staff login (incl. TOTP), session restore/refresh/logout, protected routing,
role-aware shell.

The Patients / Programs / Exercises / Approvals / Audit routes are **honest
placeholders** — they render no mock data, and each states whether its API already
exists. Programs, Exercises and Approvals are backed by working endpoints and are
the natural next screens to build.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server with API proxy |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with oxlint |
