import { Types, type HydratedDocument } from 'mongoose';
import { Enrollment, type IEnrollment } from '../../models/enrollment.model';
import { Session } from '../../models/session.model';
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
 * Enrollments service (M2.5-L). Owns the Enrollment model.
 *
 * LEVELS ARE DIFFICULTY TIERS, NOT CHAPTERS. A program's levels are "easy",
 * "Medium", "Hard" — the patient picks ONE when they start and stays on it.
 * Progress runs day-by-day within that tier, and finishing its days completes
 * the program. Nothing promotes anyone to the next level automatically; moving
 * tiers is an explicit choice, either the patient's (re-enroll) or the
 * clinician's (`setEnrollmentLevel`, audited).
 *
 * This replaced a day-driven model where finishing "easy" silently pushed the
 * patient into "Medium" — which, for a 2-day tier, meant being handed harder
 * work after two sessions with no clinical decision behind it.
 *
 * Flat (level-less) programs keep the day-only behaviour, bounded by
 * `durationDays`.
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
    // Progress is measured WITHIN the chosen tier, not across the whole
    // catalogue of tiers. A patient on "easy" does easy's days and is then
    // finished — counting Medium's and Hard's days against them would peg
    // someone who completed their program at a third done.
    const tier = levels.find((l) => l.levelNumber === enrollment.currentLevel);
    totalDays = tier?.dayCount;
    done = enrollment.completedDays.length;
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
  switchExisting: boolean,
  levelNumber?: number
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

    // A session already underway belongs to the OLD program's day, so it cannot
    // survive the switch: left open it would keep the player on exercises that
    // are no longer in the patient's plan, and anything recorded would be filed
    // against a programDay they have left.
    //
    // Closing it is silent BY DESIGN. Blocking the switch to make them go and
    // end it themselves is a chore that teaches nothing — they have already
    // said what they want by switching. Marked ABANDONED rather than deleted so
    // the partial work stays in the clinical record.
    const now = new Date();
    const openSessions = await Session.find({
      user: userId,
      state: { $nin: ['COMPLETED', 'ABANDONED'] },
    });
    for (const s of openSessions) {
      const startedAt = s.startedAt ?? s.createdAt;
      s.durationSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
      s.exercisesCompleted = s.exercises.length;
      s.completion = s.exercises.length > 0 ? 'PARTIAL' : 'SKIPPED';
      s.state = 'ABANDONED';
      s.endedAt = now;
      await s.save();
    }

    active.status = 'PAUSED';
    await active.save();
  }

  // Every enrollment starts at day 1, INCLUDING a return to a program the
  // patient has done before. Restarting is the clinical intent: a body that has
  // been off a program for weeks should not be dropped back into level 3.
  //
  // Nothing is lost by this. The earlier attempt keeps its own Enrollment row
  // (PAUSED), and every Session and ProgressDay is stamped with the enrollment
  // it belongs to, so each run through a program stays a separate, readable
  // record rather than being merged into one confusing history.
  const levels = await getLevelsMeta(programId);

  // THE PATIENT PICKS THEIR TIER.
  //
  // Levels are difficulty tiers ("easy" / "Medium" / "Hard"), not sequential
  // phases, so which one someone is on is a CHOICE made when starting the
  // program — never something the day counter walks them into. Falling back to
  // the lowest level keeps older clients (and any caller that omits it) working.
  const chosen = levelNumber ?? (levels.length > 0 ? levels[0]!.levelNumber : 1);
  if (levels.length > 0 && !levels.some((l) => l.levelNumber === chosen)) {
    throw ApiError.badRequest(
      `Level ${chosen} does not exist in this program (available: ${levels
        .map((l) => l.levelNumber)
        .join(', ')})`
    );
  }

  const enrollment = await Enrollment.create({
    user: new Types.ObjectId(userId),
    program: new Types.ObjectId(programId),
    currentLevel: chosen,
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
 * The active enrollment's id, or null. Sessions and ProgressDays are stamped
 * with it so each RUN of a program keeps its own exercise history — re-enrolling
 * restarts at day 1, so `program` alone would merge this attempt with the last.
 */
export async function getActiveEnrollmentId(userId: string): Promise<string | null> {
  const active = await findActive(userId);
  return active ? active.id : null;
}

/**
 * Move a patient to a different difficulty tier — the clinical override.
 *
 * A patient picks their tier when they start, but Dr. Harsha overrules that:
 * someone who reports "too easy" for a week belongs on Medium, and someone in
 * pain belongs on easy regardless of what they chose.
 *
 * Day progress within the tier is RESET, because day 3 of "easy" and day 3 of
 * "Hard" are different work — carrying the counter across would skip days of
 * the new tier the patient has never done. Completed-day history for the old
 * tier is preserved in the ProgressDay/Session records, which are stamped with
 * this enrollment.
 */
export async function setEnrollmentLevel(
  userId: string,
  levelNumber: number
): Promise<EnrollmentView> {
  const enrollment = await findActive(userId);
  if (!enrollment) throw ApiError.notFound('This patient has no active enrollment');

  const programId = enrollment.program.toString();
  const levels = await getLevelsMeta(programId);
  if (levels.length === 0) {
    throw ApiError.badRequest('This program has no levels to choose from');
  }
  if (!levels.some((l) => l.levelNumber === levelNumber)) {
    throw ApiError.badRequest(
      `Level ${levelNumber} does not exist in this program (available: ${levels
        .map((l) => l.levelNumber)
        .join(', ')})`
    );
  }
  if (enrollment.currentLevel === levelNumber) {
    throw ApiError.badRequest('This patient is already on that level');
  }

  enrollment.currentLevel = levelNumber;
  enrollment.currentDay = 1;
  enrollment.completedDays = [];
  await enrollment.save();

  return toView(enrollment);
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
  /**
   * DEAD as of the difficulty-tier model — levels are chosen, never advanced
   * into, so this is never set. Kept on the type only so older app builds that
   * still read it keep type-checking against this API.
   */
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
      // TIER COMPLETE → the program is done.
      //
      // NO automatic promotion to the next level. Levels are difficulty tiers
      // the patient chose when starting, not chapters to be marched through:
      // silently moving someone from "easy" to "Hard" because they finished two
      // days is precisely the bug this replaced. Moving up is a fresh, explicit
      // choice — theirs from the app, or Dr. Harsha's from the portal.
      enrollment.completedLevels.push(enrollment.currentLevel);
      enrollment.status = 'COMPLETED';
      enrollment.completedAt = new Date();
      programCompleted = true;
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
