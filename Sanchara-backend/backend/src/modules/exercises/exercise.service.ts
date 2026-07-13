import mongoose, { Types } from 'mongoose';
import { Exercise, type IExercise } from '../../models/exercise.model';
import { ApiError } from '../../utils/ApiError';
import { recordAudit } from '../../services/audit.service';
import { toPublicExercise, toAdminExercise } from './exercise.serializer';
import type { PublicExerciseDTO, AdminExerciseDTO } from './exercise.serializer';
import type { Difficulty, Gender, GenderFilter, ExerciseStatus } from '../../constants/enums';
import type { TokenRole } from '../../utils/jwt';
import type {
  ListExercisesQuery,
  CreateExerciseInput,
  UpdateExerciseInput,
} from './exercise.validation';

/**
 * Exercises service. Owns all reads/writes of the Exercise model and applies the
 * visibility rules (approval, gender, clinicalExclusive) + the videoUrl gating.
 */

/** Who is looking — resolved by the controller from the (optional) token. */
export interface Viewer {
  gender?: Gender;
  /** Passed the active-access gate → receives videoUrl. */
  entitled: boolean;
}

export interface PaginatedExercises {
  data: PublicExerciseDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const DIFFICULTY_ORDER: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

/**
 * Gender filters visible to a viewer: everyone sees 'all'; a male/female viewer
 * additionally sees their own gender. Guests (undefined) and 'other' see 'all'
 * only.
 */
function allowedGenderFilters(gender?: Gender): GenderFilter[] {
  const allowed: GenderFilter[] = ['all'];
  if (gender === 'male' || gender === 'female') allowed.push(gender);
  return allowed;
}

/** Base visibility filter shared by all public reads. */
function publicBaseFilter(gender?: Gender): mongoose.QueryFilter<IExercise> {
  return {
    status: 'APPROVED',
    clinicalExclusive: { $ne: true }, // never surface clinical-only in public
    genderFilter: { $in: allowedGenderFilters(gender) },
  };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nextDifficulty(
  current: Difficulty,
  direction: 'harder' | 'easier'
): Difficulty | null {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  const targetIdx = direction === 'harder' ? idx + 1 : idx - 1;
  return DIFFICULTY_ORDER[targetIdx] ?? null;
}

// ── Public reads ─────────────────────────────────────────────────────────────
export async function listExercises(
  query: ListExercisesQuery,
  viewer: Viewer
): Promise<PaginatedExercises> {
  const filter = publicBaseFilter(viewer.gender);

  if (query.goalTag) filter.goalTag = query.goalTag;
  if (query.areaTag) filter.areaTag = query.areaTag;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.isWarmup !== undefined) filter.isWarmup = query.isWarmup;
  if (query.isCooldown !== undefined) filter.isCooldown = query.isCooldown;
  if (query.search) {
    filter.title = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  const { page, limit } = query;
  const [docs, total] = await Promise.all([
    Exercise.find(filter)
      .sort({ title: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Exercise.countDocuments(filter),
  ]);

  return {
    data: docs.map((doc) => toPublicExercise(doc, viewer.entitled)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
}

export async function getExerciseById(
  id: string,
  viewer: Viewer
): Promise<PublicExerciseDTO> {
  const doc = await Exercise.findOne({ _id: id, ...publicBaseFilter(viewer.gender) });
  if (!doc) {
    // 404 whether missing or hidden — don't leak existence of gated content.
    throw ApiError.notFound('Exercise not found');
  }
  return toPublicExercise(doc, viewer.entitled);
}

/**
 * Internal server-to-server view of an exercise for the session engine (M5).
 * Unlike the public DTO this exposes the raw `storageKey` (Exercise.videoUrl)
 * so callers can resolve a playable URL through the video service. NEVER return
 * `storageKey` in an API response.
 */
export interface ExerciseSessionView {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  difficulty: Difficulty;
  areaTag: string[];
  isWarmup: boolean;
  isCooldown: boolean;
  storageKey: string;
}

/**
 * Batch-hydrate APPROVED exercises by id (order not guaranteed — caller
 * re-orders). Used by the session engine to build a program's exercise list.
 * No gender/clinical filtering: program contents are curated by staff/user.
 */
export async function getExercisesByIds(ids: string[]): Promise<ExerciseSessionView[]> {
  const docs = await Exercise.find({ _id: { $in: ids }, status: 'APPROVED' });
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    thumbnailUrl: d.thumbnailUrl,
    durationSeconds: d.durationSeconds,
    difficulty: d.difficulty,
    areaTag: d.areaTag,
    isWarmup: d.isWarmup,
    isCooldown: d.isCooldown,
    storageKey: d.videoUrl,
  }));
}

export async function getCategories(): Promise<{ goalTags: string[]; areaTags: string[] }> {
  const base: mongoose.QueryFilter<IExercise> = {
    status: 'APPROVED',
    clinicalExclusive: { $ne: true },
  };
  const [goalTags, areaTags] = await Promise.all([
    Exercise.distinct('goalTag', base),
    Exercise.distinct('areaTag', base),
  ]);
  return { goalTags: goalTags.sort(), areaTags: areaTags.sort() };
}

/**
 * Alternatives for the Too Hard / Too Easy swap: same body area, one difficulty
 * step in the requested direction. Behind requireActiveAccess, so videoUrl is
 * always included. Returns [] gracefully when no such alternative exists.
 */
export async function getAlternatives(
  id: string,
  direction: 'harder' | 'easier',
  viewer: Viewer
): Promise<PublicExerciseDTO[]> {
  const base = await Exercise.findById(id);
  if (!base) throw ApiError.notFound('Exercise not found');

  const targetDifficulty = nextDifficulty(base.difficulty, direction);
  if (!targetDifficulty) return []; // already at the hardest/easiest level

  const docs = await Exercise.find({
    _id: { $ne: base._id },
    ...publicBaseFilter(viewer.gender),
    difficulty: targetDifficulty,
    areaTag: { $in: base.areaTag }, // overlap on body area
  }).limit(10);

  return docs.map((doc) => toPublicExercise(doc, true));
}

// ── Staff / Admin management ─────────────────────────────────────────────────
export async function createExercise(
  input: CreateExerciseInput,
  actor: { userId: string; role: TokenRole }
): Promise<AdminExerciseDTO> {
  const isAdmin = actor.role === 'ADMIN';
  // CLINICAL_STAFF uploads land in the approval queue; ADMIN may publish directly.
  const status: ExerciseStatus = isAdmin ? input.status ?? 'APPROVED' : 'PENDING_APPROVAL';
  const uploader = new Types.ObjectId(actor.userId);

  const doc = await Exercise.create({
    title: input.title,
    description: input.description,
    videoUrl: input.videoUrl,
    thumbnailUrl: input.thumbnailUrl,
    durationSeconds: input.durationSeconds,
    goalTag: input.goalTag,
    areaTag: input.areaTag,
    difficulty: input.difficulty,
    genderFilter: input.genderFilter,
    isWarmup: input.isWarmup,
    isCooldown: input.isCooldown,
    clinicalExclusive: input.clinicalExclusive,
    status,
    uploadedBy: uploader,
    approvedBy: isAdmin && status === 'APPROVED' ? uploader : undefined,
  });

  await recordAudit({
    actor: actor.userId,
    actorRole: isAdmin ? 'ADMIN' : 'CLINICAL_STAFF',
    action: 'VIDEO_UPLOADED',
    metadata: { exerciseId: doc.id, status },
  });

  return toAdminExercise(doc);
}

export async function updateExercise(
  id: string,
  input: UpdateExerciseInput
): Promise<AdminExerciseDTO> {
  const doc = await Exercise.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true }
  );
  if (!doc) throw ApiError.notFound('Exercise not found');
  return toAdminExercise(doc);
}

export async function approveExercise(
  id: string,
  adminId: string
): Promise<AdminExerciseDTO> {
  const doc = await Exercise.findById(id);
  if (!doc) throw ApiError.notFound('Exercise not found');

  doc.status = 'APPROVED';
  doc.approvedBy = new Types.ObjectId(adminId);
  doc.rejectionReason = undefined;
  await doc.save();

  await recordAudit({
    actor: adminId,
    actorRole: 'ADMIN',
    action: 'VIDEO_APPROVED',
    metadata: { exerciseId: doc.id },
  });

  return toAdminExercise(doc);
}

export async function rejectExercise(
  id: string,
  adminId: string,
  rejectionReason: string
): Promise<AdminExerciseDTO> {
  const doc = await Exercise.findById(id);
  if (!doc) throw ApiError.notFound('Exercise not found');

  doc.status = 'REJECTED';
  doc.rejectionReason = rejectionReason;
  await doc.save();

  await recordAudit({
    actor: adminId,
    actorRole: 'ADMIN',
    action: 'VIDEO_REJECTED',
    reason: rejectionReason, // required for reject actions
    metadata: { exerciseId: doc.id },
  });

  return toAdminExercise(doc);
}

export async function listPendingExercises(): Promise<AdminExerciseDTO[]> {
  const docs = await Exercise.find({ status: 'PENDING_APPROVAL' }).sort({ createdAt: 1 });
  return docs.map(toAdminExercise);
}
