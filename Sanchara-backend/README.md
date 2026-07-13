# Sanchara

Backend for **Sanchara**, a safety-critical medical exercise application (MERN, TypeScript strict).

This repository currently contains **Layer 0** — the runnable backend skeleton. No business logic or database schemas yet; the goal is a server that boots, connects to MongoDB, and answers a health check.

## Tech stack

- **Runtime:** Node 20 LTS (`tsx` for dev, `tsc` for build)
- **Language:** TypeScript (strict mode)
- **Framework:** Express
- **Database:** MongoDB via Mongoose
- **Validation:** Zod (env + request validation)
- **Logging:** Winston
- **Package manager:** npm

Architecture is **feature-folder**: each feature under `backend/src/modules/<feature>/` owns its own routes + controller + service + validation. There are no global `routes/` or `controllers/` folders.

## Project structure

```
sanchara/
├── backend/
│   ├── src/
│   │   ├── config/       # env validation, db connection
│   │   ├── models/       # Mongoose schemas (next session)
│   │   ├── modules/      # feature folders (health/ so far)
│   │   ├── middleware/   # errorHandler, notFound, validate
│   │   ├── services/     # third-party integration stubs (mocked locally)
│   │   ├── jobs/         # scheduled jobs (node-cron)
│   │   ├── utils/        # logger, bmiCalculator, ApiError
│   │   ├── app.ts        # express app + middleware wiring
│   │   └── server.ts     # entrypoint: connect DB, then listen
│   ├── uploads/          # local file storage
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
├── shared/enums/         # shared types (later)
├── docs/
├── .nvmrc                # 20
├── .editorconfig
└── .gitignore
```

## Prerequisites

- **Node 20 LTS** (run `nvm use` — reads `.nvmrc`)
- **MongoDB** running locally at `mongodb://localhost:27017`
  - macOS (Homebrew): `brew services start mongodb-community`
  - Docker: `docker run -d -p 27017:27017 --name sanchara-mongo mongo:7`

## Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
#    Edit .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to any values.
#    MONGODB_URI already points at the local default.

# 3. Make sure MongoDB is running (see Prerequisites)

# 4. Start the dev server (auto-reloads on change)
npm run dev
```

You should see log lines for `MongoDB connected` and
`Sanchara backend listening on http://localhost:5000`.

> **macOS note:** Port **5000** is hijacked by the built-in **AirPlay Receiver**
> (you'll get `403 Forbidden` with `Server: AirTunes`). Either turn it off
> (System Settings → General → AirDrop & Handoff → **AirPlay Receiver** off), or
> set `PORT=5055` (or any free port) in your `.env`.

## Verify the health check

In another terminal:

```bash
curl http://localhost:5000/api/health
```

Expected response (HTTP 200):

```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 3,
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

If MongoDB is not reachable the endpoint returns HTTP 503 with `"db": "disconnected"`.

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start dev server with hot reload (`tsx`)     |
| `npm run build` | Compile TypeScript to `dist/`                |
| `npm start`     | Run the compiled server (`node dist/...`)    |
| `npm run lint`  | Lint the source with ESLint                  |
| `npm run typecheck` | Type-check without emitting              |

## Notes for the local-only phase

- **No cloud / Nginx / SSL / CDN.** Files are stored in the local `uploads/` folder.
- **Third-party services are mocked.** SMTP, SMS/WhatsApp, Firebase push,
  Razorpay, and the Anthropic LLM do **not** require real API keys to boot —
  their secrets are optional in `env.ts` and the `services/*.service.ts` stubs
  document how each will mock locally.
- Required env vars (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGODB_URI`)
  are validated at boot; the process exits with a clear message if any is missing.
