import { Schema, model, type Types } from 'mongoose';
import {
  ACTOR_ROLES,
  AUDIT_ACTIONS,
  AUDIT_ACTIONS_REQUIRING_REASON,
  type ActorRole,
  type AuditAction,
} from '../constants/enums';

/**
 * AuditLog = immutable clinical/admin action trail.
 *
 * APPEND-ONLY: rows are never updated or deleted. Enforcement (blocking updates)
 * lives in the service layer later; at the schema level we only guarantee shape
 * and that override-type actions always carry a `reason`.
 *
 * `actor` may reference either a Staff or a User document, so it has no fixed
 * `ref` — resolve it using `actorRole`.
 */
export interface IAuditLog {
  actor?: Types.ObjectId;
  actorRole: ActorRole;
  action: AuditAction;
  targetUser?: Types.ObjectId;
  reason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    // No fixed ref: actor can be a Staff or a User (see actorRole).
    actor: { type: Schema.Types.ObjectId, index: true },
    actorRole: { type: String, enum: ACTOR_ROLES, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    reason: {
      type: String,
      // Required for override-type actions (LEVEL_OVERRIDE, SAFETY_OVERRIDE, …).
      required: function requireReason(this: IAuditLog): boolean {
        return (AUDIT_ACTIONS_REQUIRING_REASON as readonly string[]).includes(
          this.action
        );
      },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
