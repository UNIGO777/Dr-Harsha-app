import { Types, type HydratedDocument } from 'mongoose';
import { Enrollment, type IEnrollment } from '../../models/enrollment.model';
import { ApiError } from '../../utils/ApiError';
import { getPlayableVideoUrl } from '../../services/video.service';
import { getExercisesByIds } from '../exercises/exercise.service';
import {
  getProgramMeta,
  getProgramDayContentByNumber,
  type ProgramMeta,
} from '../programs/program.service';
import type { EnrollmentStatus, Difficulty } from '../../constants/enums';

/**
 * Enrollments service. Owns the Enrollment model. Reads program/day content
 * through the programs service and hydrates videos through the video service.
 * A user may hold only ONE ACTIVE enrollment at a time (enforced here).
 */

export interface EnrollmentView {
  id: string;
  programId: string;
  program: ProgramMeta | null;
  status: EnrollmentStatus;
  currentDay: number;
  completedDays: number[];
  totalDays?: number;
  percentComplete: number;
  startedAt?: Date;
  completedAt?: Date;
}

async function toView(enrollment: HydratedDocument<IEnrollment>): Promise<EnrollmentView> {
  const program = await getProgramMeta(enrollment.program.toString());
  const totalDays = program?.durationDays;
  const percentComplete =
    totalDays && totalDays > 0
      ? Math.min(100, Math.round((enrollment.completedDays.length / totalDays) * 100))
      : 0;
  return {
    id: enrollment.id,
    programId: enrollment.program.toString(),
    program,
    status: enrollment.status,
    currentDay: enrollment.currentDay,
    completedDays: enrollment.completedDays,
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
    // Switch: pause the existing active enrollment.
    active.status = 'PAUSED';
    await active.save();
  }

  const enrollment = await Enrollment.create({
    user: new Types.ObjectId(userId),
    program: new Types.ObjectId(programId),
    currentDay: 1,
    completedDays: [],
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

export interface TodayExercise {
  exerciseId: string;
  order: number;
  sets?: number;
  notes?: string;
  title: string;
  difficulty: Difficulty;
  durationSeconds: number;
  thumbnailUrl?: string;
  videoUrl: string | null;
}

export interface TodayView {
  enrollmentId: string;
  programId: string;
  programDayId: string | null;
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  hasContent: boolean;
  exercises: TodayExercise[];
}

export async function getToday(userId: string): Promise<TodayView> {
  const active = await findActive(userId);
  if (!active) throw ApiError.badRequest('You have no active enrollment');

  const content = await getProgramDayContentByNumber(active.program.toString(), active.currentDay);
  if (!content) {
    // No template authored for this day yet — return gracefully.
    return {
      enrollmentId: active.id,
      programId: active.program.toString(),
      programDayId: null,
      dayNumber: active.currentDay,
      isRestDay: false,
      hasContent: false,
      exercises: [],
    };
  }

  if (content.isRestDay) {
    return {
      enrollmentId: active.id,
      programId: active.program.toString(),
      programDayId: content.id,
      dayNumber: content.dayNumber,
      title: content.title,
      isRestDay: true,
      hasContent: true,
      exercises: [],
    };
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
        // Entitled: requireActiveAccess passed. Never raw storageKey.
        videoUrl: getPlayableVideoUrl(v.storageKey, true),
      };
    })
    .filter((x): x is TodayExercise => x !== null);

  return {
    enrollmentId: active.id,
    programId: active.program.toString(),
    programDayId: content.id,
    dayNumber: content.dayNumber,
    title: content.title,
    isRestDay: false,
    hasContent: true,
    exercises,
  };
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

// ── progress advance (called by the session engine on complete) ────────────────
export interface AdvanceResult {
  advanced: boolean;
  currentDay?: number;
  status?: EnrollmentStatus;
  completedDays?: number[];
}

/**
 * Advance the user's ACTIVE enrollment for `programId` when they complete a day.
 * No-op for SHORT/standalone sessions (no active enrollment for that program).
 * Idempotent: only advances when the completed day equals currentDay and hasn't
 * been recorded already.
 */
export async function advanceForCompletedDay(
  userId: string,
  programId: string,
  dayNumber: number,
  durationDays?: number
): Promise<AdvanceResult> {
  const enrollment = await Enrollment.findOne({
    user: userId,
    program: programId,
    status: 'ACTIVE',
  });
  if (!enrollment) return { advanced: false };
  if (enrollment.completedDays.includes(dayNumber)) return { advanced: false };
  if (dayNumber !== enrollment.currentDay) return { advanced: false };

  enrollment.completedDays.push(dayNumber);
  enrollment.currentDay = dayNumber + 1;

  if (durationDays && enrollment.currentDay > durationDays) {
    enrollment.status = 'COMPLETED';
    enrollment.completedAt = new Date();
  }
  await enrollment.save();

  return {
    advanced: true,
    currentDay: enrollment.currentDay,
    status: enrollment.status,
    completedDays: enrollment.completedDays,
  };
}
