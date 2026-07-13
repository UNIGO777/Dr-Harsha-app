import type { HydratedDocument } from 'mongoose';
import type { IExercise } from '../../models/exercise.model';
import type { Difficulty, GenderFilter, ExerciseStatus } from '../../constants/enums';

/**
 * Public (browse/detail) DTO. `videoUrl` is present ONLY when the requester is
 * entitled (passed the active-access gate). Guests and non-subscribers get all
 * the browse metadata but never the video reference.
 */
export interface PublicExerciseDTO {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  difficulty: Difficulty;
  goalTag: string[];
  areaTag: string[];
  genderFilter: GenderFilter;
  isWarmup: boolean;
  isCooldown: boolean;
  videoUrl?: string;
}

export function toPublicExercise(
  doc: HydratedDocument<IExercise>,
  includeVideo: boolean
): PublicExerciseDTO {
  const dto: PublicExerciseDTO = {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    thumbnailUrl: doc.thumbnailUrl,
    durationSeconds: doc.durationSeconds,
    difficulty: doc.difficulty,
    goalTag: doc.goalTag,
    areaTag: doc.areaTag,
    genderFilter: doc.genderFilter,
    isWarmup: doc.isWarmup,
    isCooldown: doc.isCooldown,
  };
  // The one gating decision, applied consistently across every read endpoint.
  if (includeVideo) dto.videoUrl = doc.videoUrl;
  return dto;
}

/**
 * Full DTO for staff/admin management views (always includes videoUrl plus
 * moderation fields). Only served behind authenticate + requireRole.
 */
export interface AdminExerciseDTO extends PublicExerciseDTO {
  clinicalExclusive: boolean;
  status: ExerciseStatus;
  uploadedBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toAdminExercise(doc: HydratedDocument<IExercise>): AdminExerciseDTO {
  return {
    ...toPublicExercise(doc, true),
    clinicalExclusive: doc.clinicalExclusive,
    status: doc.status,
    uploadedBy: doc.uploadedBy.toString(),
    approvedBy: doc.approvedBy?.toString(),
    rejectionReason: doc.rejectionReason,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
