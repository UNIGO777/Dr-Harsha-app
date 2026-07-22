import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { Exercise } from '../models/exercise.model';
import { Program } from '../models/program.model';
import { ProgramDay } from '../models/programDay.model';
import { logger } from '../utils/logger';

/**
 * Dev seed (M2.5): builds the 3-level content model on top of the sample
 * exercises so program/enrollment/session flows can be run end-to-end.
 *
 *   - 2 published STANDARD catalog programs (30-day + 90-day) with tags
 *   - ~10 ProgramDays each, including a rest day
 *   - the SAME exercises reused across many days (reuse proof)
 *   - 1 SHORT standalone program (SP-001) with a single day (no enrollment)
 *
 * Idempotent: programs upsert by a natural key, days upsert by (program, dayNumber).
 * Run `npm run seed:exercises` first.
 */

interface DaySpec {
  dayNumber: number;
  title: string;
  isRestDay?: boolean;
  titles?: string[]; // exercise titles in order
}

const WEIGHT_LOSS_DAYS: DaySpec[] = [
  { dayNumber: 1, title: 'Day 1 — Warm Start', titles: ['Gentle Neck Rolls', 'Glute Bridge', 'Wall Sit', 'Deep Breathing Cooldown'] },
  { dayNumber: 2, title: 'Day 2 — Mobility', titles: ['Gentle Neck Rolls', 'Bird Dog', 'Standing Quad Stretch', 'Deep Breathing Cooldown'] },
  { dayNumber: 3, title: 'Day 3 — Lower Body', titles: ['Cat-Cow Stretch', 'Glute Bridge', 'Wall Sit', 'Deep Breathing Cooldown'] },
  { dayNumber: 4, title: 'Day 4 — Rest', isRestDay: true },
  { dayNumber: 5, title: 'Day 5 — Strength', titles: ['Bird Dog', 'Superman Hold', 'Wall Sit', 'Deep Breathing Cooldown'] },
  { dayNumber: 6, title: 'Day 6 — Endurance', titles: ['Glute Bridge', 'Standing Quad Stretch', 'Wall Sit', 'Deep Breathing Cooldown'] },
  { dayNumber: 7, title: 'Day 7 — Full Flow', titles: ['Cat-Cow Stretch', 'Bird Dog', 'Glute Bridge', 'Deep Breathing Cooldown'] },
  { dayNumber: 8, title: 'Day 8 — Power', titles: ['Gentle Neck Rolls', 'Superman Hold', 'Wall Sit', 'Deep Breathing Cooldown'] },
  { dayNumber: 9, title: 'Day 9 — Legs', titles: ['Glute Bridge', 'Wall Sit', 'Standing Quad Stretch', 'Deep Breathing Cooldown'] },
  { dayNumber: 10, title: 'Day 10 — Recovery', titles: ['Gentle Neck Rolls', 'Cat-Cow Stretch', 'Deep Breathing Cooldown'] },
];

const BACK_REHAB_DAYS: DaySpec[] = [
  { dayNumber: 1, title: 'Day 1 — Gentle Mobility', titles: ['Gentle Neck Rolls', 'Cat-Cow Stretch', 'Bird Dog', 'Deep Breathing Cooldown'] },
  { dayNumber: 2, title: 'Day 2 — Core Activation', titles: ['Gentle Neck Rolls', 'Bird Dog', 'Glute Bridge', 'Deep Breathing Cooldown'] },
  { dayNumber: 3, title: 'Day 3 — Stretch & Strengthen', titles: ['Cat-Cow Stretch', 'Glute Bridge', 'Standing Quad Stretch', 'Deep Breathing Cooldown'] },
  { dayNumber: 4, title: 'Day 4 — Build', titles: ['Cat-Cow Stretch', 'Bird Dog', 'Superman Hold', 'Deep Breathing Cooldown'] },
  { dayNumber: 5, title: 'Day 5 — Lower Body', titles: ['Gentle Neck Rolls', 'Glute Bridge', 'Wall Sit', 'Deep Breathing Cooldown'] },
  { dayNumber: 6, title: 'Day 6 — Full Flow', titles: ['Cat-Cow Stretch', 'Bird Dog', 'Glute Bridge', 'Deep Breathing Cooldown'] },
  { dayNumber: 7, title: 'Day 7 — Rest', isRestDay: true },
  { dayNumber: 8, title: 'Day 8 — Progress', titles: ['Bird Dog', 'Superman Hold', 'Standing Quad Stretch', 'Deep Breathing Cooldown'] },
  { dayNumber: 9, title: 'Day 9 — Strength', titles: ['Glute Bridge', 'Wall Sit', 'Superman Hold', 'Deep Breathing Cooldown'] },
  { dayNumber: 10, title: 'Day 10 — Recovery', titles: ['Gentle Neck Rolls', 'Cat-Cow Stretch', 'Deep Breathing Cooldown'] },
];

const SHORT_DAY: DaySpec = {
  dayNumber: 1,
  title: 'Sitting Lower Back Relief',
  titles: ['Cat-Cow Stretch', 'Bird Dog', 'Glute Bridge', 'Deep Breathing Cooldown'],
};

async function upsertProgram(
  query: Record<string, unknown>,
  set: Record<string, unknown>
): Promise<Types.ObjectId> {
  const program = await Program.findOneAndUpdate(
    query,
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return program!._id;
}

async function upsertDays(
  programId: Types.ObjectId,
  specs: DaySpec[],
  idByTitle: Map<string, Types.ObjectId>
): Promise<void> {
  for (const spec of specs) {
    const exercises = (spec.titles ?? []).map((title, index) => {
      const id = idByTitle.get(title);
      if (!id) throw new Error(`Seed exercise missing: ${title}`);
      const isEnd = index === 0 || index === (spec.titles!.length - 1);
      return { exercise: id, order: index, sets: isEnd ? undefined : 2 };
    });
    await ProgramDay.updateOne(
      { program: programId, dayNumber: spec.dayNumber },
      {
        $set: {
          program: programId,
          dayNumber: spec.dayNumber,
          title: spec.title,
          isRestDay: spec.isRestDay ?? false,
          exercises,
        },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
}

async function seed(): Promise<void> {
  await connectDB();

  const allTitles = [
    ...new Set([
      ...WEIGHT_LOSS_DAYS.flatMap((d) => d.titles ?? []),
      ...BACK_REHAB_DAYS.flatMap((d) => d.titles ?? []),
      ...(SHORT_DAY.titles ?? []),
    ]),
  ];
  const docs = await Exercise.find({ title: { $in: allTitles } }).select('_id title');
  const idByTitle = new Map(docs.map((d) => [d.title, d._id]));
  const missing = allTitles.filter((t) => !idByTitle.has(t));
  if (missing.length > 0) {
    logger.error(`Missing seed exercises: ${missing.join(', ')}. Run "npm run seed:exercises" first.`);
    await disconnectDB();
    process.exit(1);
  }

  // Program A — 30-day weight loss (published catalog)
  const weightLossId = await upsertProgram(
    { name: 'Weight Loss Kickstart' },
    {
      type: 'STANDARD',
      name: 'Weight Loss Kickstart',
      description: 'A 30-day full-body plan to build the exercise habit and burn calories.',
      durationDays: 30,
      isPublished: true,
      isActive: true,
      thumbnailUrl: 'uploads/thumbnails/weight-loss.jpg',
      goalTag: ['weight_loss', 'fitness'],
      suitableConditions: ['obesity'],
      targetAreas: ['full_body', 'legs', 'core'],
      difficultyLevel: 'MEDIUM',
      ageGroups: ['GROUP_1', 'GROUP_2'],
      genderFilter: 'all',
    }
  );
  await upsertDays(weightLossId, WEIGHT_LOSS_DAYS, idByTitle);

  // Program B — 90-day lower-back rehab (published catalog)
  const backRehabId = await upsertProgram(
    { name: 'Lower Back 90-Day Rehab' },
    {
      type: 'STANDARD',
      name: 'Lower Back 90-Day Rehab',
      description: 'A gentle 90-day program to relieve lower-back pain and rebuild core stability.',
      durationDays: 90,
      isPublished: true,
      isActive: true,
      thumbnailUrl: 'uploads/thumbnails/back-rehab.jpg',
      goalTag: ['pain_relief', 'back_pain', 'mobility'],
      suitableConditions: ['back_pain', 'hypertension'],
      targetAreas: ['lower_back', 'core', 'spine'],
      difficultyLevel: 'EASY',
      ageGroups: ['GROUP_1', 'GROUP_2'],
      genderFilter: 'all',
    }
  );
  await upsertDays(backRehabId, BACK_REHAB_DAYS, idByTitle);

  // SHORT standalone program (no enrollment)
  const shortId = await upsertProgram(
    { shortCode: 'SP-001' },
    {
      type: 'SHORT',
      name: 'Sitting Lower Back Relief',
      description: 'A short standalone lower-back relief routine.',
      shortCode: 'SP-001',
      genderFilter: 'all',
      isActive: true,
      isPublished: false,
    }
  );
  await upsertDays(shortId, [SHORT_DAY], idByTitle);

  logger.info(
    `✅ Seeded programs: Weight Loss Kickstart (${weightLossId}), ` +
      `Lower Back 90-Day Rehab (${backRehabId}), SHORT SP-001 (${shortId}).`
  );
  await disconnectDB();
  process.exit(0);
}

seed().catch((err: Error) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
