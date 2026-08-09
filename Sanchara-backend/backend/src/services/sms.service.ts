import { logger } from '../utils/logger';
import { env, isProd } from '../config/env';
import { isSmsConfigured, sendOtp as fast2smsSendOtp } from './sms/fast2sms';

/**
 * SMS service.
 *
 * Delivery goes through Fast2SMS's OTP endpoint, which renders the message from
 * a DLT-approved template keyed by `otp_id`. The provider therefore takes the
 * CODE, not a message body — hence `sendOtp(to, code)` rather than a generic
 * `sendSms(to, body)`. An arbitrary-text send would be rejected by the gateway,
 * so offering that shape would be a lie about what we can do.
 *
 * Without credentials (local dev) we fall back to a mock that logs the code.
 * In PRODUCTION that fallback is refused at boot — see `assertSmsReady`. A
 * production server that silently mocks SMS is worse than one that won't
 * start: nobody can log in, and nothing says why.
 */
export interface SmsProvider {
  readonly name: string;
  sendOtp(to: string, code: string): Promise<{ requestId: string | null }>;
}

/** Logs the code instead of sending it. Local development only. */
class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';

  async sendOtp(to: string, code: string): Promise<{ requestId: string | null }> {
    logger.info(`📱 [MOCK SMS] to ${to}: Sanchara code ${code}`);
    return { requestId: null };
  }
}

class Fast2SmsProvider implements SmsProvider {
  readonly name = 'fast2sms';

  async sendOtp(to: string, code: string): Promise<{ requestId: string | null }> {
    return fast2smsSendOtp({ to, code });
  }
}

const activeProvider: SmsProvider = isSmsConfigured()
  ? new Fast2SmsProvider()
  : new MockSmsProvider();

/**
 * Boot guard. Call once at startup: in production, refuse to run without a real
 * SMS provider, because OTP login is the ONLY way into the app.
 */
export function assertSmsReady(): void {
  if (isProd && activeProvider.name === 'mock') {
    throw new Error(
      'SMS is not configured (FAST2SMS_API_KEY / FAST2SMS_OTP_ID). ' +
        'OTP login is the only way into the app, so production cannot start without it.'
    );
  }
  logger.info(`SMS provider: ${activeProvider.name}`);
}

/**
 * Send a login code.
 *
 * The TTL is not passed in: the template's validity copy is derived from
 * `OTP_TTL_SECONDS` inside the provider, so the SMS and the server can never
 * disagree about how long the code lasts.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  await activeProvider.sendOtp(phone, otp);

  if (!isProd) {
    const minutes = Math.max(1, Math.round(env.OTP_TTL_SECONDS / 60));
    const rows = [`OTP ${otp}`, `for ${phone}`, `expires in ${minutes} min`];
    const width = Math.max(...rows.map((r) => r.length)) + 2;
    const border = '─'.repeat(width);
    const boxed = rows.map((r) => `│ ${r.padEnd(width - 1)}│`).join('\n');
    logger.info(`\n┌${border}┐\n${boxed}\n└${border}┘`);
  }
}
