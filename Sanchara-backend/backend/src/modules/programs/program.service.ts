import mongoose, { Types, type HydratedDocument } from 'mongoose';
import { Program, type IProgram } from '../../models/program.model';
import { ProgramDay, type IProgramDay } from '../../models/programDay.model';
import { ApiError } from '../../utils/ApiError';
import { getExercisesByIds } from '../exercises/exercise.service';
import type { ProgramType, Difficulty } from '../../constants/enums';
import type {
  CreateProgramInput,
  UpdateProgramInput,
  CreateDayInput,
  UpdateDayInput,
  ListProgramsQuery,
} from './program.validation';

/**
 * Programs service. Owns Program + ProgramDay. Other modules (sessions,
 * enrollments) read program/day CONTENT through the internal helpers here
 * rather than importing these models directly. Exercise access still flows
 * only through M4's exercise service.
 */

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface ProgramSummary {
  id: string;
  name?: string;
  description?: string;
  type: ProgramType;
  durationDays?: number;
  thumbnailUrl?: string;
  difficultyLevel?: Difficulty;
  goalTag: string[];
  suitableConditions: string[];
  targetAreas: string[];
  ageGroups: string[];
  isPublished: boolean;
}

export interface DaySummary {
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  exerciseCount: number;
}

export interface AdminDayExercise {
  exerciseId: string;
  order: number;
  sets?: number;
  notes?: string;
  title?: string;
  difficulty?: Difficulty;
}

export interface AdminDay {
  id: string;
  dayNumber: number;
  title?: string;
  description?: string;
  isRestDay: boolean;
  estimatedDurationSeconds?: number;
  exercises: AdminDayExercise[];
}

/** Internal content view consumed by the sessions + enrollments engines. */
export interface ProgramDayContent {
  id: string;
  program: string;
  programType: ProgramType;
  durationDays?: number;
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  exercises: { exerciseId: string; order: number; sets?: number; notes?: string }[];
}

// ── Serializers ───────────────────────────────────────────────────────────────
function toSummary(p: HydratedDocument<IProgram>): ProgramSummary {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    durationDays: p.durationDays,
    thumbnailUrl: p.thumbnailUrl,
    difficultyLevel: p.difficultyLevel,
    goalTag: p.goalTag,
    suitableConditions: p.suitableConditions,
    targetAreas: p.targetAreas,
    ageGroups: p.ageGroups,
    isPublished: p.isPublished,
  };
}

// ── Management: programs ───────────────────────────────────────────────────────
export async function createProgram(
  input: CreateProgramInput,
  staffId: string
): Promise<ProgramSummary> {
  const program = await Program.create({
    ...input,
    createdByStaff: new Types.ObjectId(staffId),
  });
  return toSummary(program);
}

export async function updateProgram(
  id: string,
  input: UpdateProgramInput
): Promise<ProgramSummary> {
  const program = await Program.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true }
  );
  if (!program) throw ApiError.notFound('Program not found');
  return toSummary(program);
}

export async function setPublished(id: string, isPublished: boolean): Promise<ProgramSummary> {
  const program = await Program.findByIdAndUpdate(
    id,
    { $set: { isPublished } },
    { new: true }
  );
  if (!program) throw ApiError.notFound('Program not found');
  return toSummary(program);
}

// ── Management: days ───────────────────────────────────────────────────────────
async function assertProgramExists(programId: string): Promise<void> {
  const exists = await Program.exists({ _id: programId });
  if (!exists) throw ApiError.notFound('Program not found');
}

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
}

export async function createDay(programId: string, input: CreateDayInput): Promise<AdminDay> {
  await assertProgramExists(programId);
  try {
    const day = await ProgramDay.create({
      program: new Types.ObjectId(programId),
      dayNumber: input.dayNumber,
      title: input.title,
      description: input.description,
      isRestDay: input.isRestDay,
      exercises: input.exercises.map((e) => ({
        exercise: new Types.ObjectId(e.exercise),
        order: e.order,
        sets: e.sets,
        notes: e.notes,
      })),
      estimatedDurationSeconds: input.estimatedDurationSeconds,
    });
    return hydrateAdminDay(day);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw ApiError.badRequest(`Day ${input.dayNumber} already exists for this program`);
    }
    throw err;
  }
}

export async function updateDay(
  programId: string,
  dayId: string,
  input: UpdateDayInput
): Promise<AdminDay> {
  const update: Record<string, unknown> = { ...input };
  if (input.exercises) {
    update.exercises = input.exercises.map((e) => ({
      exercise: new Types.ObjectId(e.exercise),
      order: e.order,
      sets: e.sets,
      notes: e.notes,
    }));
  }
  try {
    const day = await ProgramDay.findOneAndUpdate(
      { _id: dayId, program: programId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!day) throw ApiError.notFound('Program day not found');
    return hydrateAdminDay(day);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw ApiError.badRequest('Another day already uses that dayNumber');
    }
    throw err;
  }
}

export async function deleteDay(programId: string, dayId: string): Promise<void> {
  const res = await ProgramDay.deleteOne({ _id: dayId, program: programId });
  if (res.deletedCount === 0) throw ApiError.notFound('Program day not found');
}

export async function listDays(programId: string): Promise<AdminDay[]> {
  await assertProgramExists(programId);
  const days = await ProgramDay.find({ program: programId }).sort({ dayNumber: 1 });
  return Promise.all(days.map((d) => hydrateAdminDay(d)));
}

async function hydrateAdminDay(day: HydratedDocument<IProgramDay>): Promise<AdminDay> {
  const ids = day.exercises.map((e) => e.exercise.toString());
  const views = ids.length ? await getExercisesByIds(ids) : [];
  const byId = new Map(views.map((v) => [v.id, v]));
  const exercises: AdminDayExercise[] = [...day.exercises]
    .sort((a, b) => a.order - b.order)
    .map((e) => {
      const v = byId.get(e.exercise.toString());
      return {
        exerciseId: e.exercise.toString(),
        order: e.order,
        sets: e.sets,
        notes: e.notes,
        title: v?.title,
        difficulty: v?.difficulty,
      };
    });
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    isRestDay: day.isRestDay,
    estimatedDurationSeconds: day.estimatedDurationSeconds,
    exercises,
  };
}

// ── Public reads ───────────────────────────────────────────────────────────────
export async function listPublishedPrograms(
  query: ListProgramsQuery
): Promise<{ data: ProgramSummary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const filter: mongoose.QueryFilter<IProgram> = { isPublished: true, isActive: true };
  if (query.goalTag) filter.goalTag = query.goalTag;
  if (query.targetAreas) filter.targetAreas = query.targetAreas;
  if (query.difficultyLevel) filter.difficultyLevel = query.difficultyLevel;

  const { page, limit } = query;
  const [docs, total] = await Promise.all([
    // `_id` tiebreaker keeps paging deterministic when many programs share a
    // createdAt (e.g. bulk-seeded) — otherwise skip/limit can duplicate/skip rows.
    Program.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Program.countDocuments(filter),
  ]);
  return {
    data: docs.map(toSummary),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
}

export interface ProgramDetail extends ProgramSummary {
  dayCount: number;
  days: DaySummary[];
}

/** Public program detail. NO video URLs (browse only). */
export async function getProgramDetail(programId: string): Promise<ProgramDetail> {
  const program = await Program.findOne({ _id: programId, isPublished: true, isActive: true });
  if (!program) throw ApiError.notFound('Program not found');
  const days = await ProgramDay.find({ program: programId })
    .sort({ dayNumber: 1 })
    .select('dayNumber title isRestDay exercises');
  return {
    ...toSummary(program),
    dayCount: days.length,
    days: days.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      isRestDay: d.isRestDay,
      exerciseCount: d.exercises.length,
    })),
  };
}

// ── Internal content helpers (sessions + enrollments) ──────────────────────────
function toContent(day: HydratedDocument<IProgramDay>, program: HydratedDocument<IProgram>): ProgramDayContent {
  return {
    id: day.id,
    program: program.id,
    programType: program.type,
    durationDays: program.durationDays,
    dayNumber: day.dayNumber,
    title: day.title,
    isRestDay: day.isRestDay,
    exercises: [...day.exercises]
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        exerciseId: e.exercise.toString(),
        order: e.order,
        sets: e.sets,
        notes: e.notes,
      })),
  };
}

export async function getProgramDayContentById(
  programDayId: string
): Promise<ProgramDayContent | null> {
  const day = await ProgramDay.findById(programDayId);
  if (!day) return null;
  const program = await Program.findById(day.program);
  if (!program) return null;
  return toContent(day, program);
}

export async function getProgramDayContentByNumber(
  programId: string,
  dayNumber: number
): Promise<ProgramDayContent | null> {
  const program = await Program.findById(programId);
  if (!program) return null;
  const day = await ProgramDay.findOne({ program: programId, dayNumber });
  if (!day) return null;
  return toContent(day, program);
}

export interface ProgramMeta {
  id: string;
  name?: string;
  type: ProgramType;
  durationDays?: number;
  thumbnailUrl?: string;
}

export async function getProgramMeta(programId: string): Promise<ProgramMeta | null> {
  const program = await Program.findById(programId).select('name type durationDays thumbnailUrl');
  if (!program) return null;
  return {
    id: program.id,
    name: program.name,
    type: program.type,
    durationDays: program.durationDays,
    thumbnailUrl: program.thumbnailUrl,
  };
}
