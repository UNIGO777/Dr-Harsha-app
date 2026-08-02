import { z } from 'zod';

/**
 * Staff auth inputs. Unlike patients (phone + OTP), staff authenticate with
 * email + password, plus a TOTP code when their account has 2FA enrolled.
 */
export const staffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required').max(200),
  /** Required only when the account has a TOTP secret enrolled. */
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Authenticator code must be 6 digits')
    .optional(),
});

export const staffRefreshSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required'),
});

export const staffLogoutSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required'),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type StaffRefreshInput = z.infer<typeof staffRefreshSchema>;
export type StaffLogoutInput = z.infer<typeof staffLogoutSchema>;
