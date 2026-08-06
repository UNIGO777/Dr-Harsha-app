import { logger } from '../utils/logger';
import { isProd } from '../config/env';

/**
 * SMS / WhatsApp service.
 *
 * LOCAL PHASE: SMS is NOT integrated (provider charges land on the client's
 * account, wired at deploy time). We MOCK delivery by logging the message via
 * winston. The `SmsProvider` interface lets a real provider (Twilio / MSG91 /
 * WhatsApp Cloud API) drop in later without touching callers.
 *
 * TODO (deploy): implement a real provider and swap `activeProvider`.
 */
export interface SmsProvider {
  sendSms(to: string, body: string): Promise<void>;
}

/** Mock provider: logs to the console instead of sending a real SMS. */
class MockSmsProvider implements SmsProvider {
  async sendSms(to: string, body: string): Promise<void> {
    logger.info(`📱 [MOCK SMS] to ${to}: ${body}`);
  }
}

// Swap this for a real provider instance at deploy time.
const activeProvider: SmsProvider = new MockSmsProvider();

export function sendSms(to: string, body: string): Promise<void> {
  return activeProvider.sendSms(to, body);
}

/**
 * Convenience wrapper for the OTP message copy.
 *
 * In the local phase the code is also printed as a boxed banner so it's easy to
 * spot in a busy dev console — you should never have to grep for it.
 */
export async function sendOtpSms(
  phone: string,
  otp: string,
  ttlMinutes: number
): Promise<void> {
  await sendSms(
    phone,
    `Your Sanchara verification code is ${otp}. It expires in ${ttlMinutes} minutes.`
  );

  if (!isProd) {
    const rows = [`OTP ${otp}`, `for ${phone}`, `expires in ${ttlMinutes} min`];
    const width = Math.max(...rows.map((r) => r.length)) + 2;
    const border = '─'.repeat(width);
    const boxed = rows.map((r) => `│ ${r.padEnd(width - 1)}│`).join('\n');
    logger.info(`\n┌${border}┐\n${boxed}\n└${border}┘`);
  }
}
