import mongoose, { Types } from 'mongoose';
import { User, type IUser } from '../../models/user.model';
import { AuditLog } from '../../models/auditLog.model';
import { ApiError } from '../../utils/ApiError';
import { recordAudit } from '../../services/audit.service';
import { getVisiblePatientIds } from '../staff/staff.service';
import { getHistory, getTrends } from '../sessions/session.service';
import { getEnrollmentForStaff, setEnrollmentLevel } from '../enrollments/enrollment.service';
import type { AccountStatus, Gender, UserGroup, StaffRole } from '../../constants/enums';
import type { TokenRole } from '../../utils/jwt';

/**
 * Patients module — the clinical portal's read view of patients.
 *
 * OWNERSHIP NOTE: modules/auth owns the User model for *self-service* reads
 * (a patient reading their own record). This module owns *staff-facing* reads
 * of other people's records, which is a different concern with a different
 * access rule, so it reads User directly rather than routing through auth.
 * Session and enrollment data still come from their owning services.
 *
 * ACCESS RULE: ADMIN sees every patient; CLINICAL_STAFF sees only the patients
 * assigned to them. That restriction is applied to the QUERY itself (not
 * filtered after the fact), so an unassigned patient is invisible rather than
 * merely hidden.
 */

export interface PatientRow {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: Gender;
  group?: UserGroup;
  level: number;
  accountStatus: AccountStatus;
  trialEndDate?: Date;
  painAreas: string[];
  createdAt: Date;
}

function toRow(u: mongoose.HydratedDocument<IUser>): PatientRow {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    age: u.age,
    gender: u.gender,
    group: u.group,
    level: u.level,
    accountStatus: u.accountStatus,
    trialEndDate: u.trialEndDate,
    painAreas: u.painAreas ?? [],
    createdAt: u.createdAt,
  };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the base filter, applying the caller's visibility restriction.
 *
 * The scope is combined with `$and` rather than spread into the same object:
 * a shallow merge would let either side's `_id` clobber the other, which would
 * silently ignore the requested patient id and return whoever the caller can
 * see instead.
 */
async function scopedFilter(
  actor: { userId: string; role: TokenRole },
  extra: mongoose.QueryFilter<IUser> = {}
): Promise<mongoose.QueryFilter<IUser>> {
  const visible = await getVisiblePatientIds(actor.userId, actor.role as StaffRole);
  // null = admin (unrestricted). An empty array must still restrict to nothing.
  if (visible === null) return extra;
  const scope = { _id: { $in: visible } } as mongoose.QueryFilter<IUser>;
  return Object.keys(extra).length === 0 ? scope : { $and: [extra, scope] };
}

export async function listPatients(
  actor: { userId: string; role: TokenRole },
  query: {
    search?: string;
    accountStatus?: AccountStatus;
    group?: UserGroup;
    page: number;
    limit: number;
  }
): Promise<{
  data: PatientRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  statusCounts: Record<AccountStatus, number>;
}> {
  const extra: mongoose.QueryFilter<IUser> = {};
  if (query.accountStatus) extra.accountStatus = query.accountStatus;
  if (query.group) extra.group = query.group;
  if (query.search) {
    const rx = { $regex: escapeRegex(query.search), $options: 'i' };
    Object.assign(extra, { $or: [{ name: rx }, { phone: rx }, { email: rx }] });
  }

  const filter = await scopedFilter(actor, extra);
  const scopeOnly = await scopedFilter(actor);

  const { page, limit } = query;
  const [docs, total, counts] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
    // Counts ignore the search/status filters but respect visibility, so the
    // status tabs show true totals for what this staff member can see.
    User.aggregate<{ _id: AccountStatus; n: number }>([
      { $match: scopeOnly },
      { $group: { _id: '$accountStatus', n: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = { active: 0, waitlisted: 0, locked: 0 } as Record<AccountStatus, number>;
  for (const row of counts) statusCounts[row._id] = row.n;

  return {
    data: docs.map(toRow),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    statusCounts,
  };
}

/**
 * Block / unblock a patient, or approve one off the waitlist.
 *
 * `locked` makes `requireActiveAccess` reject every session, program and video
 * request with reason 'locked', so the patient keeps their account and history
 * but cannot exercise. Reversible, and always audit-logged with a reason.
 *
 * Scoped like every other read here: a clinician can only act on their own
 * assigned patients.
 */
export async function setAccountStatus(
  actor: { userId: string; role: TokenRole },
  patientId: string,
  accountStatus: AccountStatus,
  reason: string
): Promise<PatientRow> {
  const filter = await scopedFilter(actor, { _id: new Types.ObjectId(patientId) });
  const user = await User.findOne(filter);
  if (!user) throw ApiError.notFound('Patient not found');

  const previous = user.accountStatus;
  if (previous === accountStatus) {
    throw ApiError.badRequest(`This patient is already ${accountStatus}`);
  }

  user.accountStatus = accountStatus;
  await user.save();

  await recordAudit({
    actor: actor.userId,
    actorRole: actor.role === 'ADMIN' ? 'ADMIN' : 'CLINICAL_STAFF',
    action: 'ACCOUNT_STATUS_CHANGED',
    targetUser: user.id,
    reason,
    metadata: { from: previous, to: accountStatus },
  });

  return toRow(user);
}

/**
 * Move a patient to a different difficulty tier.
 *
 * Goes through the same `scopedFilter` as every other patient write, so a
 * clinician can only re-tier their OWN patients, and is audited with a reason —
 * changing someone's difficulty is a clinical decision, not a settings tweak.
 */
export async function setPatientLevel(
  actor: { userId: string; role: TokenRole },
  patientId: string,
  levelNumber: number,
  reason: string
): Promise<Awaited<ReturnType<typeof setEnrollmentLevel>>> {
  const filter = await scopedFilter(actor, { _id: new Types.ObjectId(patientId) });
  const user = await User.findOne(filter);
  if (!user) throw ApiError.notFound('Patient not found');

  const before = await getEnrollmentForStaff(user.id);
  const enrollment = await setEnrollmentLevel(user.id, levelNumber);

  await recordAudit({
    actor: actor.userId,
    actorRole: actor.role === 'ADMIN' ? 'ADMIN' : 'CLINICAL_STAFF',
    action: 'LEVEL_OVERRIDE',
    targetUser: user.id,
    reason,
    metadata: { from: before?.currentLevel, to: levelNumber, programId: enrollment.programId },
  });

  return enrollment;
}

export interface PatientDetail extends PatientRow {
  conditions: string[];
  surgeryHistory?: string;
  goal?: string;
  exerciseHistory?: string;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  maxHr?: number;
  trialStartDate?: Date;
  weeklyActivity: { currentMinutes: number; weekStartDate?: Date };
  enrollment: Awaited<ReturnType<typeof getEnrollmentForStaff>>;
  recentSessions: Awaited<ReturnType<typeof getHistory>>['data'];
  trends: Awaited<ReturnType<typeof getTrends>>;
  /** Sessions the patient started despite a high pain score — clinically important. */
  safetyOverrides: { at: Date; reason?: string; maxScore?: number }[];
}

export async function getPatient(
  actor: { userId: string; role: TokenRole },
  patientId: string
): Promise<PatientDetail> {
  const filter = await scopedFilter(actor, { _id: new Types.ObjectId(patientId) });
  const user = await User.findOne(filter);
  // 404 rather than 403 for out-of-scope patients: a clinician shouldn't be able
  // to probe which patient ids exist outside their assignment.
  if (!user) throw ApiError.notFound('Patient not found');

  const [enrollment, history, trends, overrides] = await Promise.all([
    getEnrollmentForStaff(user.id),
    getHistory(user.id, { page: 1, limit: 10 }),
    getTrends(user.id),
    AuditLog.find({ targetUser: user._id, action: 'SAFETY_OVERRIDE' })
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  // The session engine records the override with the patient as ACTOR (they made
  // the call), so also look those up.
  const selfOverrides = await AuditLog.find({
    actor: user._id,
    action: 'SAFETY_OVERRIDE',
  })
    .sort({ createdAt: -1 })
    .limit(10);

  const allOverrides = [...overrides, ...selfOverrides]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map((log) => ({
      at: log.createdAt,
      reason: log.reason,
      maxScore: (log.metadata as { maxScore?: number } | undefined)?.maxScore,
    }));

  return {
    ...toRow(user),
    conditions: user.conditions ?? [],
    surgeryHistory: user.surgeryHistory,
    goal: user.goal,
    exerciseHistory: user.exerciseHistory,
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    bmi: user.bmi,
    maxHr: user.maxHr,
    trialStartDate: user.trialStartDate,
    weeklyActivity: {
      currentMinutes: user.weeklyActivity?.currentMinutes ?? 0,
      weekStartDate: user.weeklyActivity?.weekStartDate,
    },
    enrollment,
    recentSessions: history.data,
    trends,
    safetyOverrides: allOverrides,
  };
}
