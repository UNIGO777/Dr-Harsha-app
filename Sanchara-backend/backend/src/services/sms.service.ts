import { logger } from '../utils/logger';

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

/** Convenience wrapper for the OTP message copy. */
export function sendOtpSms(phone: string, otp: string, ttlMinutes: number): Promise<void> {
  return sendSms(
    phone,
    `Your Sanchara verification code is ${otp}. It expires in ${ttlMinutes} minutes.`
  );
}
