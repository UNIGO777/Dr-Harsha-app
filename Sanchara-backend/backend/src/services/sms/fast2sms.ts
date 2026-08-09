import { env } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Fast2SMS OTP delivery.
 *
 * Uses Fast2SMS's OTP endpoint, which renders the message from a template
 * registered against `otp_id` — we hand it the CODE, not a message body. That
 * is why the SmsProvider interface exposes `sendOtp(to, code)` rather than the
 * generic `sendSms(to, body)`: a DLT-approved template cannot take arbitrary
 * text, and pretending otherwise would fail at the gateway.
 *
 * Nothing here ever logs the code. See the error handling below — that is
 * deliberate, not incidental.
 */

/**
 * The OTP product's endpoint — NOT /dev/bulkV2. bulkV2 is the generic bulk-SMS
 * route and expects a `numbers` field; posting an OTP payload there fails with
 * "Numbers Missing" while still passing authentication, which makes the mistake
 * look like a credentials problem when it isn't.
 * https://docs.fast2sms.com/reference/send-otp
 */
const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/otp/send';
const REQUEST_TIMEOUT_MS = 10_000;

export function isSmsConfigured(): boolean {
  return Boolean(env.FAST2SMS_API_KEY && env.FAST2SMS_OTP_ID);
}

/**
 * Fast2SMS expects a bare 10-digit Indian subscriber number — no `+`, no
 * country code. We store E.164 (`+919876543210`), so strip it back down and
 * reject anything that isn't a plausible Indian mobile rather than letting the
 * gateway fail with "The mobile must be 10 digits."
 */
export function toIndianSubscriberNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;

  if (!/^[6-9]\d{9}$/.test(local)) {
    throw new Error('fast2sms: not a valid Indian mobile number');
  }
  return local;
}

export async function sendOtp({
  to,
  code,
}: {
  to: string;
  code: string;
}): Promise<{ requestId: string | null }> {
  if (!isSmsConfigured()) {
    throw new Error('fast2sms: FAST2SMS_API_KEY / FAST2SMS_OTP_ID are not configured');
  }

  const mobile = toIndianSubscriberNumber(to);

  // `otp_expiry` and `otp_length` are DERIVED from the server's own OTP
  // settings, never configured separately. They only tell Fast2SMS how to
  // render its template; the code, its real lifetime and its attempt limit are
  // all ours. A second set of knobs would let the SMS advertise a validity
  // window the server does not honour.
  const payload = {
    mobile,
    otp_id: env.FAST2SMS_OTP_ID,
    otp_expiry: Math.max(1, Math.round(env.OTP_TTL_SECONDS / 60)),
    otp_length: env.OTP_LENGTH,
    otp: code,
  };

  let response: Response;
  try {
    response = await fetch(FAST2SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: env.FAST2SMS_API_KEY as string,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      // So a hung gateway cannot hold an auth request open.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    // Deliberate: a fetch error can carry the request init, and our request body
    // contains the OTP. Attaching `cause` would put the code on the error chain,
    // where a crash reporter or a `cause`-walking log would surface it.
    logger.error(
      `fast2sms: request failed (${(cause as Error)?.name ?? 'error'})`
    );
    throw new Error('fast2sms: request failed');
  }

  let body: { return?: boolean; message?: unknown; request_id?: string } | null;
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = null;
  }

  if (!response.ok || body?.return !== true) {
    // The provider's own message is a rejection reason ("The mobile must be 10
    // digits.", "Invalid OTP ID") and does not echo our code. Never the body.
    const providerMessage = Array.isArray(body?.message)
      ? body.message.join('; ')
      : (body?.message ?? null);
    logger.error(
      `fast2sms: send rejected (status=${response.status} provider=${String(providerMessage)})`
    );
    throw new Error('fast2sms: gateway rejected the message');
  }

  const requestId = body?.request_id ?? null;
  logger.info(`fast2sms: otp accepted (requestId=${requestId})`);
  return { requestId };
}
