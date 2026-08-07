import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * Upload service (M2.5) — LOCAL multer diskStorage into uploads/videos and
 * uploads/thumbnails. Produces a STORAGE KEY (never a public URL); playable URLs
 * are only ever produced by video.service.
 *
 * DEPLOY: replace local diskStorage with Bunny.net Stream upload. Callers must
 * not change.
 */

const VIDEO_SUBDIR = 'videos';
const THUMB_SUBDIR = 'thumbnails';

/** Only the `video` field is a video; every other accepted field is imagery. */
function subdirFor(fieldname: string): string {
  return fieldname === 'video' ? VIDEO_SUBDIR : THUMB_SUBDIR;
}

function isImageField(fieldname: string): boolean {
  return fieldname !== 'video';
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const dir = path.join(env.UPLOAD_DIR, subdirFor(file.fieldname));
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Safe, unique, collision-free names — never trust the client filename.
    const ext = isImageField(file.fieldname)
      ? path.extname(file.originalname).toLowerCase() || '.jpg'
      : '.mp4';
    cb(null, `${randomUUID()}${ext}`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (file.fieldname === 'video') {
    if (file.mimetype === 'video/mp4') cb(null, true);
    else cb(new ApiError(400, 'Only MP4 video is accepted (multipart field "video")'));
  } else if (file.fieldname === 'thumbnail') {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new ApiError(400, 'Thumbnail must be an image (multipart field "thumbnail")'));
  } else {
    cb(new ApiError(400, `Unexpected file field: ${file.fieldname}`));
  }
}

const runMulter = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_VIDEO_SIZE_MB * 1024 * 1024 },
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

/**
 * Multer middleware that normalises upload errors (size/type) into ApiError so
 * the central error handler returns clean 400 JSON.
 */
export function uploadExerciseMedia(req: Request, res: Response, next: NextFunction): void {
  runMulter(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `File exceeds the ${env.MAX_VIDEO_SIZE_MB}MB limit`
          : err.message;
      next(new ApiError(400, message));
      return;
    }
    next(err instanceof ApiError ? err : new ApiError(400, (err as Error).message));
  });
}

/** Storage KEY (not a public URL) to persist in Exercise.videoUrl / thumbnailUrl. */
export function toStorageKey(file: Express.Multer.File): string {
  return `uploads/${subdirFor(file.fieldname)}/${file.filename}`;
}

const MAX_IMAGE_MB = 5;

/**
 * Single-image upload (multipart field "image") for program covers and any
 * other artwork. Separate from the exercise media handler, which requires a
 * video — reusing that here would reject an image-only request.
 */
const runImageMulter = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new ApiError(400, 'Only image files are accepted (multipart field "image")'));
  },
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
}).single('image');

export function uploadImage(req: Request, res: Response, next: NextFunction): void {
  runImageMulter(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `Image exceeds the ${MAX_IMAGE_MB}MB limit`
          : err.message;
      next(new ApiError(400, message));
      return;
    }
    next(err instanceof ApiError ? err : new ApiError(400, (err as Error).message));
  });
}
