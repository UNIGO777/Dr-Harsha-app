import mongoose, { Types, type HydratedDocument } from 'mongoose';
import { Program, type IProgram } from '../../models/program.model';
import { ProgramLevel, type IProgramLevel } from '../../models/programLevel.model';
import { ProgramDay, type IProgramDay } from '../../models/programDay.model';
import { ApiError } from '../../utils/ApiError';
import { getExercisesByIds } from '../exercises/exercise.service';
import { getImageUrl } from '../../services/video.service';
import type { ProgramType, Difficulty } from '../../constants/enums';
import type {
  CreateProgramInput,
  UpdateProgramInput,
  CreateLevelInput,
  UpdateLevelInput,
  CreateDayInput,
  UpdateDayInput,
  ListProgramsQuery,
} from './program.validation';

/**
 * Programs service (M2.5-L). Owns Program + ProgramLevel + ProgramDay:
 *
 *   Program → ProgramLevel (Level 1..N) → ProgramDay (Day 1..N per level) → Exercises
 *
 * Other modules (sessions, enrollments) read program/level/day CONTENT through
 * the internal helpers here rather than importing these models directly.
 * Exercise access still flows only through M4's exercise service.
 */

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface ProgramSummary {
  id: string;
  name?: string;
  description?: string;
  type: ProgramType;
  durationDays?: number;
  /** Raw stored value — a storage key, or an absolute URL for seeded content. */
  thumbnailUrl?: string;
  /** Ready for an <img src>; handles both storage keys and absolute URLs. */
  thumbnailImageUrl: string | null;
  difficultyLevel?: Difficulty;
  goalTag: string[];
  suitableConditions: string[];
  targetAreas: string[];
  ageGroups: string[];
  isPublished: boolean;
}

export interface LevelSummary {
  id: string;
  levelNumber: number;
  title?: string;
  description?: string;
  dayCount: number;
}

export interface DaySummary {
  /** ProgramDay id — the app needs it to POST /sessions/start. No video data. */
  id: string;
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
  /**
   * False when the exercise is no longer APPROVED (or was deleted). The session
   * engine SKIPS these, so the patient sees fewer exercises than are listed
   * here — which is invisible unless we say so.
   */
  playable: boolean;
}

export interface AdminDay {
  id: string;
  levelNumber?: number;
  dayNumber: number;
  title?: string;
  description?: string;
  isRestDay: boolean;
  estimatedDurationSeconds?: number;
  exercises: AdminDayExercise[];
  /** How many of `exercises` the patient will NOT be shown. 0 when healthy. */
  unavailableCount: number;
}

/** Internal content view consumed by the sessions + enrollments engines. */
export interface ProgramDayContent {
  id: string;
  program: string;
  programType: ProgramType;
  durationDays?: number;
  levelNumber?: number;
  levelTitle?: string;
  dayNumber: number;
  title?: string;
  isRestDay: boolean;
  exercises: { exerciseId: string; order: number; sets?: number; notes?: string }[];
}

/** Internal level meta for progress math (enrollments). */
export interface LevelMeta {
  levelNumber: number;
  title?: string;
  dayCount: number;
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
    thumbnailImageUrl: getImageUrl(p.thumbnailUrl),
    difficultyLevel: p.difficultyLevel,
    goalTag: p.goalTag,
    suitableConditions: p.suitableConditions,
    targetAreas: p.targetAreas,
    ageGroups: p.ageGroups,
    isPublished: p.isPublished,
  };
}

// ── Shared helpers ────────────────────────────────────────────────────────────
async function assertProgramExists(programId: string): Promise<void> {
  const exists = await Program.exists({ _id: programId });
  if (!exists) throw ApiError.notFound('Program not found');
}

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
}

/** Neutralise regex metacharacters so a search term can't alter the query. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Day counts per levelNumber for one program (single aggregate). */
async function dayCountsByLevel(programId: string): Promise<Map<number | null, number>> {
  const rows = await ProgramDay.aggregate<{ _id: number | null; count: number }>([
    { $match: { program: new Types.ObjectId(programId) } },
    { $group: { _id: { $ifNull: ['$levelNumber', null] }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.count]));
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

// ── Management: levels (M2.5-L) ────────────────────────────────────────────────
function toLevelSummary(level: HydratedDocument<IProgramLevel>, dayCount: number): LevelSummary {
  return {
    id: level.id,
    levelNumber: level.levelNumber,
    title: level.title,
    description: level.description,
    dayCount,
  };
}

export async function createLevel(programId: string, input: CreateLevelInput): Promise<LevelSummary> {
  await assertProgramExists(programId);
  try {
    const level = await ProgramLevel.create({
      program: new Types.ObjectId(programId),
      levelNumber: input.levelNumber,
      title: input.title,
      description: input.description,
    });
    return toLevelSummary(level, 0);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw ApiError.badRequest(`Level ${input.levelNumber} already exists for this program`);
    }
    throw err;
  }
}

export async function updateLevel(
  programId: string,
  levelId: string,
  input: UpdateLevelInput
): Promise<LevelSummary> {
  const level = await ProgramLevel.findOne({ _id: levelId, program: programId });
  if (!level) throw ApiError.notFound('Program level not found');

  // Renumbering a level must carry its days along (they reference the ordinal).
  const oldNumber = level.levelNumber;
  try {
    if (input.levelNumber !== undefined) level.levelNumber = input.levelNumber;
    if (input.title !== undefined) level.title = input.title;
    if (input.description !== undefined) level.description = input.description;
    await level.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw ApiError.badRequest('Another level already uses that levelNumber');
    }
    throw err;
  }
  if (input.levelNumber !== undefined && input.levelNumber !== oldNumber) {
    await ProgramDay.updateMany(
      { program: programId, levelNumber: oldNumber },
      { $set: { levelNumber: input.levelNumber } }
    );
  }

  const counts = await dayCountsByLevel(programId);
  return toLevelSummary(level, counts.get(level.levelNumber) ?? 0);
}

export async function deleteLevel(programId: string, levelId: string): Promise<void> {
  const level = await ProgramLevel.findOne({ _id: levelId, program: programId });
  if (!level) throw ApiError.notFound('Program level not found');
  const dayCount = await ProgramDay.countDocuments({
    program: programId,
    levelNumber: level.levelNumber,
  });
  if (dayCount > 0) {
    throw ApiError.badRequest(
      `Level ${level.levelNumber} still has ${dayCount} day(s) — delete or move them first`
    );
  }
  await level.deleteOne();
}

export async function listLevels(programId: string): Promise<LevelSummary[]> {
  await assertProgramExists(programId);
  const [levels, counts] = await Promise.all([
    ProgramLevel.find({ program: programId }).sort({ levelNumber: 1 }),
    dayCountsByLevel(programId),
  ]);
  return levels.map((l) => toLevelSummary(l, counts.get(l.levelNumber) ?? 0));
}

/** Lightweight level meta for progress math. [] = flat (level-less) program. */
export async function getLevelsMeta(programId: string): Promise<LevelMeta[]> {
  const [levels, counts] = await Promise.all([
    ProgramLevel.find({ program: programId }).sort({ levelNumber: 1 }).select('levelNumber title'),
    dayCountsByLevel(programId),
  ]);
  return levels.map((l) => ({
    levelNumber: l.levelNumber,
    title: l.title,
    dayCount: counts.get(l.levelNumber) ?? 0,
  }));
}

// ── Management: days ───────────────────────────────────────────────────────────
/**
 * Days must live inside a level when the program has levels, and must NOT
 * reference one when it doesn't (flat programs, e.g. SHORT).
 */
async function assertValidLevelForDay(
  programId: string,
  levelNumber: number | undefined
): Promise<void> {
  const levelNumbers = (
    await ProgramLevel.find({ program: programId }).select('levelNumber')
  ).map((l) => l.levelNumber);

  if (levelNumbers.length > 0) {
    if (levelNumber === undefined) {
      throw ApiError.badRequest('This program uses levels — levelNumber is required for its days');
    }
    if (!levelNumbers.includes(levelNumber)) {
      throw ApiError.badRequest(`Level ${levelNumber} does not exist — create it first`);
    }
  } else if (levelNumber !== undefined) {
    throw ApiError.badRequest('This program has no levels — create the level first');
  }
}

export async function createDay(programId: string, input: CreateDayInput): Promise<AdminDay> {
  await assertProgramExists(programId);
  await assertValidLevelForDay(programId, input.levelNumber);
  try {
    const day = await ProgramDay.create({
      program: new Types.ObjectId(programId),
      levelNumber: input.levelNumber,
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
      throw ApiError.badRequest(
        `Day ${input.dayNumber} already exists ${input.levelNumber !== undefined ? `in level ${input.levelNumber}` : 'for this program'}`
      );
    }
    throw err;
  }
}

export async function updateDay(
  programId: string,
  dayId: string,
  input: UpdateDayInput
): Promise<AdminDay> {
  if (input.levelNumber !== undefined) {
    await assertValidLevelForDay(programId, input.levelNumber);
  }
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
      throw ApiError.badRequest('Another day already uses that levelNumber/dayNumber slot');
    }
    throw err;
  }
}

export async function deleteDay(programId: string, dayId: string): Promise<void> {
  const res = await ProgramDay.deleteOne({ _id: dayId, program: programId });
  if (res.deletedCount === 0) throw ApiError.notFound('Program day not found');
}

export async function listDays(programId: string, levelNumber?: number): Promise<AdminDay[]> {
  await assertProgramExists(programId);
  const filter: mongoose.QueryFilter<IProgramDay> = { program: programId };
  if (levelNumber !== undefined) filter.levelNumber = levelNumber;
  const days = await ProgramDay.find(filter).sort({ levelNumber: 1, dayNumber: 1 });
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
        playable: !!v,
      };
    });
  return {
    id: day.id,
    levelNumber: day.levelNumber,
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    isRestDay: day.isRestDay,
    estimatedDurationSeconds: day.estimatedDurationSeconds,
    exercises,
    unavailableCount: exercises.filter((e) => !e.playable).length,
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
  // Default browse shows enrollable catalog programs; ?type=SHORT fetches the
  // standalone quick sessions instead.
  filter.type = query.type ?? 'STANDARD';

  const { page, limit } = query;
  const [docs, total] = await Promise.all([
    Program.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Program.countDocuments(filter),
  ]);
  return {
    data: docs.map(toSummary),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
}

// ── Staff reads (clinical portal) ─────────────────────────────────────────────
/**
 * Portal list row. Unlike the patient-facing list this includes UNPUBLISHED
 * drafts and inactive programs — staff need to see what they're still building —
 * plus level/day counts so the table is useful at a glance.
 */
export interface AdminProgramRow extends ProgramSummary {
  isActive: boolean;
  levelCount: number;
  dayCount: number;
  updatedAt: Date;
}

export interface AdminListQuery {
  search?: string;
  type?: ProgramType;
  isPublished?: boolean;
  page: number;
  limit: number;
}

export async function listProgramsForStaff(query: AdminListQuery): Promise<{
  data: AdminProgramRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const filter: mongoose.QueryFilter<IProgram> = {};
  if (query.type) filter.type = query.type;
  if (query.isPublished !== undefined) filter.isPublished = query.isPublished;
  if (query.search) {
    filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  const { page, limit } = query;
  const [docs, total] = await Promise.all([
    Program.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Program.countDocuments(filter),
  ]);

  // Two grouped counts rather than N queries per row.
  const ids = docs.map((d) => d._id);
  const [levelCounts, dayCounts] = await Promise.all([
    ProgramLevel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { program: { $in: ids } } },
      { $group: { _id: '$program', count: { $sum: 1 } } },
    ]),
    ProgramDay.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { program: { $in: ids } } },
      { $group: { _id: '$program', count: { $sum: 1 } } },
    ]),
  ]);
  const levelBy = new Map(levelCounts.map((r) => [r._id.toString(), r.count]));
  const dayBy = new Map(dayCounts.map((r) => [r._id.toString(), r.count]));

  return {
    data: docs.map((p) => ({
      ...toSummary(p),
      isActive: p.isActive,
      levelCount: levelBy.get(p.id) ?? 0,
      dayCount: dayBy.get(p.id) ?? 0,
      updatedAt: p.updatedAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
}

export interface AdminProgramDetail extends AdminProgramRow {
  levels: (LevelSummary & { days: AdminDay[] })[];
  /** Days with no level — flat programs (e.g. SHORT). */
  days: AdminDay[];
}

/**
 * Portal detail: the full authoring tree regardless of publish state. The
 * patient-facing `getProgramDetail` deliberately hides drafts, so staff need
 * their own read.
 */
export async function getProgramDetailForStaff(programId: string): Promise<AdminProgramDetail> {
  const program = await Program.findById(programId);
  if (!program) throw ApiError.notFound('Program not found');

  const [levels, dayDocs] = await Promise.all([
    ProgramLevel.find({ program: programId }).sort({ levelNumber: 1 }),
    ProgramDay.find({ program: programId }).sort({ levelNumber: 1, dayNumber: 1 }),
  ]);

  const hydrated = await Promise.all(dayDocs.map((d) => hydrateAdminDay(d)));
  const counts = await dayCountsByLevel(programId);

  return {
    ...toSummary(program),
    isActive: program.isActive,
    levelCount: levels.length,
    dayCount: dayDocs.length,
    updatedAt: program.updatedAt,
    levels: levels.map((l) => ({
      ...toLevelSummary(l, counts.get(l.levelNumber) ?? 0),
      days: hydrated.filter((d) => d.levelNumber === l.levelNumber),
    })),
    days: hydrated.filter((d) => d.levelNumber === undefined),
  };
}

export interface PublicLevel {
  levelNumber: number;
  title?: string;
  description?: string;
  dayCount: number;
  days: DaySummary[];
}

export interface ProgramDetail extends ProgramSummary {
  dayCount: number;
  totalLevels: number;
  levels: PublicLevel[];
  /** Flat day list — only populated for level-less programs. */
  days: DaySummary[];
}

/** Public program detail. NO video URLs (browse only). */
export async function getProgramDetail(programId: string): Promise<ProgramDetail> {
  const program = await Program.findOne({ _id: programId, isPublished: true, isActive: true });
  if (!program) throw ApiError.notFound('Program not found');

  const [levels, days] = await Promise.all([
    ProgramLevel.find({ program: programId }).sort({ levelNumber: 1 }),
    ProgramDay.find({ program: programId })
      .sort({ levelNumber: 1, dayNumber: 1 })
      .select('levelNumber dayNumber title isRestDay exercises'),
  ]);

  const toDaySummary = (d: (typeof days)[number]): DaySummary => ({
    id: d.id,
    dayNumber: d.dayNumber,
    title: d.title,
    isRestDay: d.isRestDay,
    exerciseCount: d.exercises.length,
  });

  const publicLevels: PublicLevel[] = levels.map((l) => {
    const levelDays = days.filter((d) => d.levelNumber === l.levelNumber).map(toDaySummary);
    return {
      levelNumber: l.levelNumber,
      title: l.title,
      description: l.description,
      dayCount: levelDays.length,
      days: levelDays,
    };
  });

  return {
    ...toSummary(program),
    dayCount: days.length,
    totalLevels: levels.length,
    levels: publicLevels,
    days: levels.length === 0 ? days.map(toDaySummary) : [],
  };
}

// ── Internal content helpers (sessions + enrollments) ──────────────────────────
async function toContent(
  day: HydratedDocument<IProgramDay>,
  program: HydratedDocument<IProgram>
): Promise<ProgramDayContent> {
  let levelTitle: string | undefined;
  if (day.levelNumber !== undefined) {
    const level = await ProgramLevel.findOne({
      program: program._id,
      levelNumber: day.levelNumber,
    }).select('title');
    levelTitle = level?.title;
  }
  return {
    id: day.id,
    program: program.id,
    programType: program.type,
    durationDays: program.durationDays,
    levelNumber: day.levelNumber,
    levelTitle,
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
  dayNumber: number,
  levelNumber?: number
): Promise<ProgramDayContent | null> {
  const program = await Program.findById(programId);
  if (!program) return null;
  const day = await ProgramDay.findOne({
    program: programId,
    dayNumber,
    // Level-less days index as null — match explicitly so Level-1-Day-1 and a
    // flat Day 1 can never be confused.
    levelNumber: levelNumber ?? null,
  });
  if (!day) return null;
  return toContent(day, program);
}

export interface ProgramMeta {
  id: string;
  name?: string;
  type: ProgramType;
  durationDays?: number;
  thumbnailUrl?: string;
  thumbnailImageUrl: string | null;
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
    thumbnailImageUrl: getImageUrl(program.thumbnailUrl),
  };
}
