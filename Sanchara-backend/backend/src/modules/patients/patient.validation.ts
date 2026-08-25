import { z } from 'zod';
import { ACCOUNT_STATUSES, USER_GROUPS } from '../../constants/enums';

export const listPatientsQuerySchema = z.object({
  /** Matches name, phone or email. */
  search: z.string().trim().min(1).max(100).optional(),
  accountStatus: z.enum(ACCOUNT_STATUSES).optional(),
  group: z.enum(USER_GROUPS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const patientIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id'),
});

/**
 * Blocking / unblocking / approving off the waitlist. A reason is mandatory —
 * this decides whether a patient can access their prescribed exercise, and the
 * audit log requires one for ACCOUNT_STATUS_CHANGED.
 */
export const setStatusSchema = z.object({
  accountStatus: z.enum(ACCOUNT_STATUSES),
  reason: z.string().trim().min(3, 'Give a reason (recorded in the audit log)').max(500),
});

/** Clinical override of a patient's difficulty tier. Always audited. */
export const setLevelSchema = z.object({
  levelNumber: z.number().int().min(1).max(50),
  reason: z.string().trim().min(3, 'Give a reason (recorded in the audit log)').max(500),
});

export type SetStatusInput = z.infer<typeof setStatusSchema>;
export type SetLevelInput = z.infer<typeof setLevelSchema>;

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
