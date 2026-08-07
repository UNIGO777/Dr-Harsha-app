import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import { getUserContext } from '../auth/auth.service';
import { toStorageKey } from '../../services/upload.service';
import * as exerciseService from './exercise.service';
import type { Viewer } from './exercise.service';
import type {
  ListExercisesQuery,
  AlternativesQuery,
  CreateExerciseInput,
  UpdateExerciseInput,
  RejectExerciseInput,
  StaffListExercisesQuery,
} from './exercise.validation';

/**
 * Resolve the viewer from the (optional) authenticated user: gender drives
 * visibility filtering, entitlement drives videoUrl inclusion. Guests and
 * users whose record vanished are treated as non-entitled with no gender.
 */
async function resolveViewer(req: Request): Promise<Viewer> {
  if (!req.user) return { entitled: false };
  const ctx = await getUserContext(req.user.userId);
  if (!ctx) return { entitled: false };
  return { gender: ctx.gender, entitled: ctx.entitled };
}

// ── Public browse ────────────────────────────────────────────────────────────
export async function listExercises(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const viewer = await resolveViewer(req);
    const query = req.query as unknown as ListExercisesQuery;
    const result = await exerciseService.listExercises(query, viewer);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getExercise(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const viewer = await resolveViewer(req);
    const exercise = await exerciseService.getExerciseById((req.params.id as string), viewer);
    res.json({ success: true, exercise });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await exerciseService.getCategories();
    res.json({ success: true, ...categories });
  } catch (err) {
    next(err);
  }
}

export async function getAlternatives(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Behind requireActiveAccess: req.user is guaranteed and entitled.
    const viewer = await resolveViewer(req);
    const { direction } = req.query as unknown as AlternativesQuery;
    const alternatives = await exerciseService.getAlternatives(
      (req.params.id as string),
      direction,
      viewer
    );
    res.json({ success: true, direction, alternatives });
  } catch (err) {
    next(err);
  }
}

// ── Staff / Admin management ─────────────────────────────────────────────────
export async function createExercise(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = req.user;
    if (!actor) throw ApiError.unauthorized('Not authenticated');
    const input = req.body as CreateExerciseInput;
    const exercise = await exerciseService.createExercise(input, actor);
    res.status(201).json({ success: true, exercise });
  } catch (err) {
    next(err);
  }
}

export async function updateExercise(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as UpdateExerciseInput;
    const exercise = await exerciseService.updateExercise(
      req.params.id as string,
      input,
      req.user
    );
    res.json({ success: true, exercise });
  } catch (err) {
    next(err);
  }
}

export async function approveExercise(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const admin = req.user;
    if (!admin) throw ApiError.unauthorized('Not authenticated');
    const exercise = await exerciseService.approveExercise((req.params.id as string), admin.userId);
    res.json({ success: true, exercise });
  } catch (err) {
    next(err);
  }
}

export async function rejectExercise(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const admin = req.user;
    if (!admin) throw ApiError.unauthorized('Not authenticated');
    const { rejectionReason } = req.body as RejectExerciseInput;
    const exercise = await exerciseService.rejectExercise(
      (req.params.id as string),
      admin.userId,
      rejectionReason
    );
    res.json({ success: true, exercise });
  } catch (err) {
    next(err);
  }
}

/** GET /api/exercises/admin — the portal's full library (all statuses). */
export async function listForStaff(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await exerciseService.listExercisesForStaff(
      req.query as unknown as StaffListExercisesQuery
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function listPending(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const exercises = await exerciseService.listPendingExercises();
    res.json({ success: true, exercises });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/exercises/upload-video — stores an MP4 (+ optional thumbnail) locally
 * and returns STORAGE KEYS. The staff then saves videoStorageKey to an
 * Exercise.videoUrl via POST/PATCH /exercises. No public/playable URL is returned.
 */
export async function uploadVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as
      | { video?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] }
      | undefined;
    const video = files?.video?.[0];
    if (!video) throw ApiError.badRequest('A video file is required (multipart field "video")');
    const thumbnail = files?.thumbnail?.[0];
    res.status(201).json({
      success: true,
      videoStorageKey: toStorageKey(video),
      thumbnailStorageKey: thumbnail ? toStorageKey(thumbnail) : undefined,
      note: 'Save videoStorageKey to Exercise.videoUrl via POST/PATCH /api/exercises.',
    });
  } catch (err) {
    next(err);
  }
}
