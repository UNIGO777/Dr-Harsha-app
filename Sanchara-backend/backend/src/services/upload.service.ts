/**
 * Upload service — multer.
 *
 * TODO (next session): configure multer disk storage into UPLOAD_DIR with a
 *       size limit driven by MAX_VIDEO_SIZE_MB.
 * TODO: validate mime types (video/image only) and generate safe unique
 *       filenames (uuid) to prevent path traversal / collisions.
 * TODO: export ready-made middleware, e.g. `uploadVideo.single('file')`.
 * NOTE: local phase writes to the local ./uploads folder; swap for S3/GCS later.
 */

export {};
