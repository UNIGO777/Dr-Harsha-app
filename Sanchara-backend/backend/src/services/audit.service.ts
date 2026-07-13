import { AuditLog } from '../models/auditLog.model';
import { logger } from '../utils/logger';
import type { ActorRole, AuditAction } from '../constants/enums';

/**
 * Audit service — the single writer of the immutable AuditLog trail. Other
 * modules record clinical/admin actions through `recordAudit` instead of
 * importing the AuditLog model directly (keeps the model with its owner).
 *
 * Best-effort: a failed audit write is logged but does NOT throw, so it can
 * never break the primary action. (If audit becomes a hard compliance gate,
 * make this throw.)
 */
export interface RecordAuditInput {
  actor?: string;
  actorRole: ActorRole;
  action: AuditAction;
  targetUser?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await AuditLog.create({
      actor: input.actor,
      actorRole: input.actorRole,
      action: input.action,
      targetUser: input.targetUser,
      reason: input.reason,
      metadata: input.metadata,
    });
  } catch (err) {
    logger.error(
      `Failed to write audit log (${input.action}): ${(err as Error).message}`
    );
  }
}
