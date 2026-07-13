import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { Exercise } from '../models/exercise.model';
import { logger } from '../utils/logger';

/**
 * Dev seed: inserts ~10 APPROVED sample exercises so browse/filter/alternatives
 * can be exercised without the clinical portal. Idempotent — upserts by title,
 * so re-running does not duplicate.
 *
 * Run with:  npm run seed:exercises
 */

// A fixed synthetic "uploader" id (no real Staff doc exists yet — M19 handles
// staff-authored uploads). uploadedBy/approvedBy are never exposed in browse.
const SEED_UPLOADER = new Types.ObjectId('000000000000000000000001');

interface SeedExercise {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  goalTag: string[];
  areaTag: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  genderFilter: 'all' | 'male' | 'female';
  isWarmup?: boolean;
  isCooldown?: boolean;
  clinicalExclusive?: boolean;
}

const slug = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const rawSeeds: SeedExercise[] = [
  {
    title: 'Gentle Neck Rolls',
    description: 'Slow controlled neck rolls to warm up the cervical spine.',
    durationSeconds: 45,
    goalTag: ['mobility', 'warmup'],
    areaTag: ['neck', 'upper_back'],
    difficulty: 'EASY',
    genderFilter: 'all',
    isWarmup: true,
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Cat-Cow Stretch',
    description: 'Flowing spinal mobilization to relieve lower-back stiffness.',
    durationSeconds: 60,
    goalTag: ['mobility', 'back_pain'],
    areaTag: ['lower_back', 'spine'],
    difficulty: 'EASY',
    genderFilter: 'all',
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Bird Dog',
    description: 'Core and lower-back stability from a quadruped position.',
    durationSeconds: 60,
    goalTag: ['stability', 'back_pain'],
    areaTag: ['lower_back', 'core'],
    difficulty: 'MEDIUM',
    genderFilter: 'all',
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Glute Bridge',
    description: 'Posterior-chain strengthening for hips and lower back.',
    durationSeconds: 50,
    goalTag: ['strength'],
    areaTag: ['glutes', 'lower_back'],
    difficulty: 'MEDIUM',
    genderFilter: 'all',
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Superman Hold',
    description: 'Advanced lower-back and core extension hold.',
    durationSeconds: 45,
    goalTag: ['strength', 'back_pain'],
    areaTag: ['lower_back', 'core'],
    difficulty: 'HARD',
    genderFilter: 'all',
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Standing Quad Stretch',
    description: 'Gentle standing stretch for the quadriceps and knees.',
    durationSeconds: 40,
    goalTag: ['flexibility'],
    areaTag: ['legs', 'knees'],
    difficulty: 'EASY',
    genderFilter: 'all',
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Wall Sit',
    description: 'Isometric quad and knee strengthening against a wall.',
    durationSeconds: 60,
    goalTag: ['strength'],
    areaTag: ['legs', 'knees'],
    difficulty: 'HARD',
    genderFilter: 'all',
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: "Pelvic Floor Activation",
    description: 'Targeted pelvic-floor engagement for postnatal recovery.',
    durationSeconds: 40,
    goalTag: ['womens_health'],
    areaTag: ['pelvic_floor', 'core'],
    difficulty: 'EASY',
    genderFilter: 'female',
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Post-Surgical Knee Mobilization',
    description: 'Clinician-guided gentle knee ROM for post-op rehabilitation.',
    durationSeconds: 50,
    goalTag: ['rehab'],
    areaTag: ['knees'],
    difficulty: 'EASY',
    genderFilter: 'all',
    clinicalExclusive: true,
    videoUrl: '',
    thumbnailUrl: '',
  },
  {
    title: 'Deep Breathing Cooldown',
    description: 'Diaphragmatic breathing to close out a session.',
    durationSeconds: 60,
    goalTag: ['recovery', 'cooldown'],
    areaTag: ['full_body'],
    difficulty: 'EASY',
    genderFilter: 'all',
    isCooldown: true,
    videoUrl: '',
    thumbnailUrl: '',
  },
];

async function seed(): Promise<void> {
  await connectDB();

  let upserted = 0;
  for (const ex of rawSeeds) {
    const doc = {
      ...ex,
      videoUrl: `uploads/exercises/${slug(ex.title)}.mp4`,
      thumbnailUrl: `uploads/thumbnails/${slug(ex.title)}.jpg`,
      isWarmup: ex.isWarmup ?? false,
      isCooldown: ex.isCooldown ?? false,
      clinicalExclusive: ex.clinicalExclusive ?? false,
      status: 'APPROVED' as const,
      uploadedBy: SEED_UPLOADER,
      approvedBy: SEED_UPLOADER,
    };
    await Exercise.updateOne(
      { title: ex.title }, // natural key → idempotent
      { $set: doc },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  logger.info(`✅ Seeded ${upserted} exercises (idempotent upsert by title).`);
  await disconnectDB();
  process.exit(0);
}

seed().catch((err: Error) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
