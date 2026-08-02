import { connectDB, disconnectDB } from '../config/db';
import { Staff } from '../models/staff.model';
import { hashPassword } from '../modules/staff/staff.service';
import { logger } from '../utils/logger';

/**
 * Dev seed: two clinical-portal accounts so the admin web app can be logged into.
 *
 *   admin@sanchara.test   / Admin@12345   → ADMIN (full access)
 *   clinician@sanchara.test / Clinic@12345 → CLINICAL_STAFF (assigned patients only)
 *
 * TOTP is left DISABLED so local login is one step. The login endpoint enforces
 * it automatically for any account that has a `totpSecret` — enrol one with an
 * authenticator app when you want to exercise 2FA.
 *
 * Idempotent: upserts by email. Passwords are re-hashed on every run, so this
 * doubles as a password reset for local dev.
 *
 * ⚠️ DEV ONLY — never run against production; these credentials are public.
 *
 * Run with:  npm run seed:staff
 */
const ACCOUNTS = [
  {
    email: 'admin@sanchara.test',
    password: 'Admin@12345',
    name: 'Dr. Harsha S.',
    role: 'ADMIN' as const,
  },
  {
    email: 'clinician@sanchara.test',
    password: 'Clinic@12345',
    name: 'Meera Nair',
    role: 'CLINICAL_STAFF' as const,
  },
];

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    logger.error('Refusing to seed staff accounts in production.');
    process.exit(1);
  }

  await connectDB();

  for (const account of ACCOUNTS) {
    const passwordHash = await hashPassword(account.password);
    await Staff.updateOne(
      { email: account.email },
      {
        $set: {
          email: account.email,
          passwordHash,
          name: account.name,
          role: account.role,
          isActive: true,
        },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    logger.info(`  ${account.role.padEnd(14)} ${account.email}  (password: ${account.password})`);
  }

  logger.info(`✅ Seeded ${ACCOUNTS.length} staff accounts for the clinical portal.`);
  await disconnectDB();
  process.exit(0);
}

seed().catch((err: Error) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
