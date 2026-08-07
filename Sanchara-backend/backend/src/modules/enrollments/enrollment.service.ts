import { Types, type HydratedDocument } from 'mongoose';
import { Enrollment, type IEnrollment } from '../../models/enrollment.model';
import { ApiError } from '../../utils/ApiError';
import { getImageUrl, getPlayableVideoUrl } from '../../services/video.service';
import { getExercisesByIds } from '../exercises/exercise.service';
import {
  getProgramMeta,
  getProgramDayContentByNumber,
  getLevelsMeta,
  type ProgramMeta,
} from '../programs/program.service';
import type { EnrollmentStatus, Difficulty } from '../../constants/enums';
import { clinicDateString, nextClinicDate } from '../../utils/clinicDate';

/**
 * Enrollments service (M2.5-L). Owns the Enrollment model. Progress is now
 * level-wise: the user advances day-by-day WITHIN a level; finishing a level's
 * days unlocks the next level; finishing the last level completes the program.
 * Flat (level-less) programs keep the old day-only behaviour.
 *
 * A user may hold only ONE ACTIVE enrollment at a time (enforced here).
 */

export interface EnrollmentView {
  id: string;
  programId: string;
  program: ProgramMeta | null;
  status: EnrollmentStatus;
  currentLevel: number;
  currentDay: number;
  completedDays: number[];
  completedLevels: number[];
  totalLevels: number;
  totalDays?: number;
  percentComplete: number;
  startedAt?: Date;
  completedAt?: Date;
}

async function toView(enrollment: HydratedDocument<IEnrollment>): Promise<EnrollmentView> {
  const programId = enrollment.program.toString();
  const [program, levels] = await Promise.all([getProgramMeta(programId), getLevelsMeta(programId)]);

  let totalDays: number | undefined;
  let done: number;
  if (levels.length > 0) {
    totalDays = levels.reduce((s, l) => s + l.dayCount, 0);
    done =
      enrollment.completedLevels.reduce(
        (s, ln) => s + (levels.find((l) => l.levelNumber === ln)?.dayCount ?? 0),
        0
      ) + enrollment.completedDays.length;
  } else {
    totalDays = program?.durationDays;
    done = enrollment.completedDays.length;
  }
  const percentComplete =
    totalDays && totalDays > 0 ? Math.min(100, Math.round((done / totalDays) * 100)) : 0;

  return {
    id: enrollment.id,
    programId,
    program,
    status: enrollment.status,
    currentLevel: enrollment.currentLevel,
    currentDay: enrollment.currentDay,
    completedDays: enrollment.completedDays,
    completedLevels: enrollment.completedLevels,
    totalLevels: levels.length,
    totalDays,
    percentComplete,
    startedAt: enrollment.startedAt,
    completedAt: enrollment.completedAt,
  };
}

async function findActive(userId: string): Promise<HydratedDocument<IEnrollment> | null> {
  return Enrollment.findOne({ user: userId, status: 'ACTIVE' });
}

async function loadOwned(userId: string, enrollmentId: string): Promise<HydratedDocument<IEnrollment>> {
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, user: userId });
  if (!enrollment) throw ApiError.notFound('Enrollment not found');
  return enrollment;
}

// ── enroll ────────────────────────────────────────────────────────────────────
export async function enroll(
  userId: string,
  programId: string,
  switchExisting: boolean
): Promise<EnrollmentView> {
  const program = await getProgramMeta(programId);
  if (!program) throw ApiError.notFound('Program not found');
  if (program.type === 'SHORT') {
    throw ApiError.badRequest('SHORT programs are standalone and do not require enrollment');
  }

  const active = await findActive(userId);
  if (active) {
    if (active.program.toString() === programId) {
      return toView(active); // already enrolled — idempotent
    }
    if (!switchExisting) {
      throw new ApiError(409, 'You already have an active enrollment', {
        details: { reason: 'active_enrollment_exists', hint: 'pass ?switch=true to switch programs' },
      });
    }
    active.status = 'PAUSED';
    await active.save();
  }

  // Start at the program's first level (lowest levelNumber), day 1.
  const levels = await getLevelsMeta(programId);
  const firstLevel = levels.length > 0 ? levels[0]!.levelNumber : 1;

  const enrollment = await Enrollment.create({
    user: new Types.ObjectId(userId),
    program: new Types.ObjectId(programId),
    currentLevel: firstLevel,
    currentDay: 1,
    completedDays: [],
    completedLevels: [],
    status: 'ACTIVE',
    startedAt: new Date(),
  });
  return toView(enrollment);
}

// ── reads ─────────────────────────────────────────────────────────────────────
export async function getMyEnrollment(userId: string): Promise<EnrollmentView | null> {
  const active = await findActive(userId);
  return active ? toView(active) : null;
}

/**
 * A patient's current enrollment, for the clinical portal. Falls back to their
 * most recent enrollment when none is active, so staff can still see what the
 * patient was last doing (paused, abandoned or completed).
 */
export async function getEnrollmentForStaff(userId: string): Promise<EnrollmentView | null> {
  const active = await findActive(userId);
  if (active) return toView(active);
  const latest = await Enrollment.findOne({ user: userId }).sort({ updatedAt: -1 });
  return latest ? toView(latest) : null;
}

export interface TodayExercise {
  exerciseId: string;
  order: number;
  sets?: number;
  notes?: string;
  title: string;
  difficulty: Difficulty;
  durationSeconds: number;
  thumbnailUrl?: string;
  /** `thumbnailUrl` resolved to something a client can actually load. */
  thumbnailImageUrl: string | null;
  videoUrl: string | null;
}

export interface TodayView {
  enrollmentId: string;
  programId: string;
  programDayId: string | null;
  levelNumber?: number;
  levelTitle?: string;
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  hasContent: boolean;
  /**
   * True when a day was already completed TODAY. The pointer has moved on, but
   * this day may not be started until the calendar does too.
   */
  locked: boolean;
  /** Clinic-local date (YYYY-MM-DD) this day unlocks. Set only when locked. */
  unlocksOn?: string;
  exercises: TodayExercise[];
}

/** Resolve the ACTIVE enrollment's current-day content (level-aware). */
async function resolveTodayContent(active: HydratedDocument<IEnrollment>) {
  const programId = active.program.toString();
  const levels = await getLevelsMeta(programId);
  const levelNumber = levels.length > 0 ? active.currentLevel : undefined;
  return getProgramDayContentByNumber(programId, active.currentDay, levelNumber);
}

export async function getToday(userId: string): Promise<TodayView> {
  const active = await findActive(userId);
  if (!active) throw ApiError.badRequest('You have no active enrollment');

  const today = clinicDateString();
  const locked = active.lastCompletedOn === today;
  const unlocksOn = locked ? nextClinicDate(active.lastCompletedOn!) : undefined;

  const content = await resolveTodayContent(active);
  if (!content) {
    // No template authored for this level/day yet — return gracefully.
    return {
      enrollmentId: active.id,
      programId: active.program.toString(),
      programDayId: null,
      levelNumber: active.currentLevel,
      dayNumber: active.currentDay,
      isRestDay: false,
      hasContent: false,
      locked,
      unlocksOn,
      exercises: [],
    };
  }

  const base = {
    enrollmentId: active.id,
    programId: active.program.toString(),
    programDayId: content.id,
    levelNumber: content.levelNumber,
    levelTitle: content.levelTitle,
    dayNumber: content.dayNumber,
    title: content.title,
    hasContent: true,
    locked,
    unlocksOn,
  };

  if (content.isRestDay) {
    return { ...base, isRestDay: true, exercises: [] };
  }

  const views = await getExercisesByIds(content.exercises.map((e) => e.exerciseId));
  const byId = new Map(views.map((v) => [v.id, v]));
  const exercises: TodayExercise[] = content.exercises
    .map((e): TodayExercise | null => {
      const v = byId.get(e.exerciseId);
      if (!v) return null;
      return {
        exerciseId: v.id,
        order: e.order,
        sets: e.sets,
        notes: e.notes,
        title: v.title,
        difficulty: v.difficulty,
        durationSeconds: v.durationSeconds,
        thumbnailUrl: v.thumbnailUrl,
        thumbnailImageUrl: getImageUrl(v.thumbnailUrl),
        // Entitled: requireActiveAccess passed. Never raw storageKey.
        videoUrl: getPlayableVideoUrl(v.storageKey, true),
      };
    })
    .filter((x): x is TodayExercise => x !== null);

  return { ...base, isRestDay: false, exercises };
}

// ── pause / resume ─────────────────────────────────────────────────────────────
export async function pause(userId: string, enrollmentId: string): Promise<EnrollmentView> {
  const enrollment = await loadOwned(userId, enrollmentId);
  if (enrollment.status !== 'ACTIVE') {
    throw ApiError.badRequest(`Cannot pause an enrollment that is ${enrollment.status}`);
  }
  enrollment.status = 'PAUSED';
  await enrollment.save();
  return toView(enrollment);
}

export async function resume(userId: string, enrollmentId: string): Promise<EnrollmentView> {
  const enrollment = await loadOwned(userId, enrollmentId);
  if (enrollment.status !== 'PAUSED') {
    throw ApiError.badRequest(`Cannot resume an enrollment that is ${enrollment.status}`);
  }
  const active = await findActive(userId);
  if (active) {
    throw new ApiError(409, 'You already have another active enrollment', {
      details: { reason: 'active_enrollment_exists' },
    });
  }
  enrollment.status = 'ACTIVE';
  await enrollment.save();
  return toView(enrollment);
}

// ── progress advance (session engine + rest days) ──────────────────────────────
export interface AdvanceResult {
  advanced: boolean;
  currentLevel?: number;
  currentDay?: number;
  status?: EnrollmentStatus;
  completedDays?: number[];
  completedLevels?: number[];
  /** True when this completion finished the level and moved to the next one. */
  levelAdvanced?: boolean;
  /** True when this completion finished the whole program. */
  programCompleted?: boolean;
  /** Clinic-local date (YYYY-MM-DD) the next day becomes available. */
  nextUnlocksOn?: string;
}

export interface AdvanceOpts {
  dayNumber: number;
  levelNumber?: number;
  /** Fallback total for flat (level-less) programs. */
  durationDays?: number;
}

/**
 * Advance the user's ACTIVE enrollment for `programId` when they complete a day.
 * Level-aware: completing the last day of a level pushes the level into
 * completedLevels, moves to the next level's day 1 (completedDays resets), and
 * completing the last level completes the program.
 *
 * No-op for SHORT/standalone sessions (no active enrollment for that program).
 * Idempotent: only advances when the completed (level, day) equals the
 * enrollment's current position and hasn't been recorded already.
 */
export async function advanceForCompletedDay(
  userId: string,
  programId: string,
  opts: AdvanceOpts
): Promise<AdvanceResult> {
  const enrollment = await Enrollment.findOne({
    user: userId,
    program: programId,
    status: 'ACTIVE',
  });
  if (!enrollment) return { advanced: false };

  const levels = await getLevelsMeta(programId);
  let levelAdvanced = false;
  let programCompleted = false;

  if (levels.length > 0) {
    // Level-aware path.
    if (opts.levelNumber === undefined) return { advanced: false };
    if (opts.levelNumber !== enrollment.currentLevel) return { advanced: false };
    if (opts.dayNumber !== enrollment.currentDay) return { advanced: false };
    if (enrollment.completedDays.includes(opts.dayNumber)) return { advanced: false };

    enrollment.completedDays.push(opts.dayNumber);
    enrollment.currentDay = opts.dayNumber + 1;

    const level = levels.find((l) => l.levelNumber === enrollment.currentLevel);
    if (level && enrollment.currentDay > level.dayCount) {
      // LEVEL COMPLETE → unlock the next level (or finish the program).
      enrollment.completedLevels.push(enrollment.currentLevel);
      const next = levels.find((l) => l.levelNumber > enrollment.currentLevel);
      if (next) {
        enrollment.currentLevel = next.levelNumber;
        enrollment.currentDay = 1;
        enrollment.completedDays = [];
        levelAdvanced = true;
      } else {
        enrollment.status = 'COMPLETED';
        enrollment.completedAt = new Date();
        programCompleted = true;
      }
    }
  } else {
    // Flat (level-less) path — original day-only behaviour.
    if (enrollment.completedDays.includes(opts.dayNumber)) return { advanced: false };
    if (opts.dayNumber !== enrollment.currentDay) return { advanced: false };

    enrollment.completedDays.push(opts.dayNumber);
    enrollment.currentDay = opts.dayNumber + 1;

    if (opts.durationDays && enrollment.currentDay > opts.durationDays) {
      enrollment.status = 'COMPLETED';
      enrollment.completedAt = new Date();
      programCompleted = true;
    }
  }

  // Stamp the clinic-local day this was finished on. The pointer moves to the
  // next day immediately (so the patient sees their progress), but that day
  // stays LOCKED until the calendar rolls over — see `isLockedForToday`.
  enrollment.lastCompletedOn = clinicDateString();

  await enrollment.save();
  return {
    advanced: true,
    currentLevel: enrollment.currentLevel,
    currentDay: enrollment.currentDay,
    status: enrollment.status,
    completedDays: enrollment.completedDays,
    completedLevels: enrollment.completedLevels,
    levelAdvanced,
    programCompleted,
    nextUnlocksOn: nextClinicDate(enrollment.lastCompletedOn),
  };
}

/**
 * One program day per calendar day.
 *
 * Returns the lock state for a user's ACTIVE enrollment. Exported so the
 * sessions module can enforce it at /sessions/start without reaching into the
 * Enrollment model directly.
 */
export async function getDailyLock(userId: string): Promise<{
  locked: boolean;
  lastCompletedOn?: string;
  nextUnlocksOn?: string;
}> {
  const active = await findActive(userId);
  if (!active?.lastCompletedOn) return { locked: false };

  return {
    locked: active.lastCompletedOn === clinicDateString(),
    lastCompletedOn: active.lastCompletedOn,
    nextUnlocksOn: nextClinicDate(active.lastCompletedOn),
  };
}

/**
 * Rest days have no session to complete, so the app calls this to mark today's
 * rest day done and advance (same level-up rules as a workout day).
 */
export async function completeRestDay(userId: string): Promise<AdvanceResult> {
  const active = await findActive(userId);
  if (!active) throw ApiError.badRequest('You have no active enrollment');

  // Same one-per-day rule as a workout: ticking off a rest day advances the
  // enrollment, so without this a patient could clear several days at once.
  if (active.lastCompletedOn === clinicDateString()) {
    throw new ApiError(409, 'You have already completed a day today', {
      details: {
        reason: 'day_already_completed',
        unlocksOn: nextClinicDate(active.lastCompletedOn),
      },
    });
  }

  const content = await resolveTodayContent(active);
  if (!content) throw ApiError.badRequest('No content for the current day');
  if (!content.isRestDay) {
    throw ApiError.badRequest('Today is not a rest day — complete the workout session instead');
  }

  return advanceForCompletedDay(userId, active.program.toString(), {
    dayNumber: content.dayNumber,
    levelNumber: content.levelNumber,
    durationDays: content.durationDays,
  });
}
