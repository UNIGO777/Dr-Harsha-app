import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env before anything else reads process.env.
dotenv.config();

/**
 * Central environment schema. Every variable the backend depends on is declared
 * here and validated at boot. If a required var is missing or malformed the
 * process crashes immediately with a readable message — we never run on silent
 * `undefined`, which matters for a safety-critical medical app.
 *
 * NOTE (local-only phase): third-party secrets (SMTP/Razorpay/Anthropic/Firebase)
 * are OPTIONAL so the server boots without real API keys. Their services are
 * mocked until we wire real providers.
 */
const envSchema = z.object({
  // Core
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required (e.g. mongodb://localhost:27017/sanchara)'),

  // Auth / JWT (required — the app is meaningless without signing secrets)
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRY: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRY: z.string().min(1).default('7d'),

  // ── OTP ───────────────────────────────────────────────────────────────────
  // The SERVER owns the code's length and lifetime. Fast2SMS is told these
  // values so its template renders the right copy — it never sets them. A
  // separate FAST2SMS_OTP_EXPIRY / _LENGTH would let the SMS advertise a
  // validity window the server does not honour, so those knobs do not exist.
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),

  // ── SMS (Fast2SMS) ────────────────────────────────────────────────────────
  // Optional so local dev boots without credentials and falls back to the mock
  // provider. In PRODUCTION their absence is fatal — see assertSmsReady().
  FAST2SMS_API_KEY: z.string().min(1).optional(),
  FAST2SMS_OTP_ID: z.string().min(1).optional(),

  // Email (SMTP) — optional in local phase, mocked if absent
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Uploads
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  MAX_VIDEO_SIZE_MB: z.coerce.number().int().positive().default(100),

  /**
   * IANA zone the clinic's "day" is measured in — the boundary for the
   * one-session-per-day rule. Server UTC would roll over at 05:30 IST, midway
   * through a patient's morning, so this must be the clinic's own zone.
   */
  CLINIC_TIMEZONE: z.string().min(1).default('Asia/Kolkata'),

  // Payments (Razorpay) — optional/mocked in local phase
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // AI (Anthropic) — optional/mocked in local phase
  ANTHROPIC_API_KEY: z.string().optional(),
  CHATBOT_DAILY_LIMIT: z.coerce.number().int().positive().default(20),

  // Push (Firebase) — optional/mocked in local phase.
  // Path to a service-account JSON file (kept out of git).
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail loud and clear — do not let the process limp forward.
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  // Logger may not be initialised yet, so use console directly here.
  console.error(
    `\n❌ Invalid or missing environment variables:\n${issues}\n\n` +
      `Copy backend/.env.example to backend/.env and fill in the required values.\n`
  );
  process.exit(1);
}

export type Env = z.infer<typeof envSchema>;

export const env: Env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
