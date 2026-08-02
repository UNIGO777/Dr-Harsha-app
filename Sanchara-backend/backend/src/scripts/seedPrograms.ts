import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { Exercise } from '../models/exercise.model';
import { Program } from '../models/program.model';
import { ProgramLevel } from '../models/programLevel.model';
import { ProgramDay } from '../models/programDay.model';
import { logger } from '../utils/logger';

/**
 * Dev seed (M2.5-L): builds the 4-level content model on top of the sample
 * exercises so program/level/enrollment/session flows run end-to-end.
 *
 *   Program → ProgramLevel → ProgramDay → Exercises
 *
 *   - 2 published STANDARD programs, each with 2 levels × 5 days (incl. a rest
 *     day) — days restart at 1 inside every level
 *   - the SAME exercises reused across levels/days/programs (reuse proof)
 *   - 1 SHORT standalone flat program (SP-001, no levels, no enrollment)
 *
 * durationDays mirrors the authored content (10) so percent math is coherent.
 * Idempotent: upserts by natural keys. Run `npm run seed:exercises` first.
 */

interface DaySpec {
  dayNumber: number;
  title: string;
  isRestDay?: boolean;
  titles?: string[]; // exercise titles in order
}

interface LevelSpec {
  levelNumber: number;
  title: string;
  description?: string;
  days: DaySpec[];
}

const WEIGHT_LOSS_LEVELS: LevelSpec[] = [
  {
    levelNumber: 1,
    title: 'Foundation',
    description: 'Build the habit with gentle full-body work.',
    days: [
      { dayNumber: 1, title: 'L1 Day 1 — Warm Start', titles: ['Gentle Neck Rolls', 'Glute Bridge', 'Deep Breathing Cooldown'] },
      { dayNumber: 2, title: 'L1 Day 2 — Mobility', titles: ['Gentle Neck Rolls', 'Bird Dog', 'Standing Quad Stretch', 'Deep Breathing Cooldown'] },
      { dayNumber: 3, title: 'L1 Day 3 — Lower Body', titles: ['Cat-Cow Stretch', 'Glute Bridge', 'Wall Sit', 'Deep Breathing Cooldown'] },
      { dayNumber: 4, title: 'L1 Day 4 — Rest', isRestDay: true },
      { dayNumber: 5, title: 'L1 Day 5 — Full Flow', titles: ['Cat-Cow Stretch', 'Bird Dog', 'Glute Bridge', 'Deep Breathing Cooldown'] },
    ],
  },
  {
    levelNumber: 2,
    title: 'Momentum',
    description: 'Higher intensity as your capacity grows.',
    days: [
      { dayNumber: 1, title: 'L2 Day 1 — Strength', titles: ['Bird Dog', 'Superman Hold', 'Wall Sit', 'Deep Breathing Cooldown'] },
      { dayNumber: 2, title: 'L2 Day 2 — Endurance', titles: ['Glute Bridge', 'Standing Quad Stretch', 'Wall Sit', 'Deep Breathing Cooldown'] },
      { dayNumber: 3, title: 'L2 Day 3 — Rest', isRestDay: true },
      { dayNumber: 4, title: 'L2 Day 4 — Power', titles: ['Gentle Neck Rolls', 'Superman Hold', 'Wall Sit', 'Deep Breathing Cooldown'] },
      { dayNumber: 5, title: 'L2 Day 5 — Finisher', titles: ['Cat-Cow Stretch', 'Superman Hold', 'Glute Bridge', 'Deep Breathing Cooldown'] },
    ],
  },
];

const BACK_REHAB_LEVELS: LevelSpec[] = [
  {
    levelNumber: 1,
    title: 'Gentle Start',
    description: 'Low-intensity mobilization for pain relief.',
    days: [
      { dayNumber: 1, title: 'L1 Day 1 — Gentle Mobility', titles: ['Gentle Neck Rolls', 'Cat-Cow Stretch', 'Bird Dog', 'Deep Breathing Cooldown'] },
      { dayNumber: 2, title: 'L1 Day 2 — Core Activation', titles: ['Gentle Neck Rolls', 'Bird Dog', 'Glute Bridge', 'Deep Breathing Cooldown'] },
      { dayNumber: 3, title: 'L1 Day 3 — Rest', isRestDay: true },
      { dayNumber: 4, title: 'L1 Day 4 — Stretch & Strengthen', titles: ['Cat-Cow Stretch', 'Glute Bridge', 'Standing Quad Stretch', 'Deep Breathing Cooldown'] },
      { dayNumber: 5, title: 'L1 Day 5 — Full Flow', titles: ['Cat-Cow Stretch', 'Bird Dog', 'Glute Bridge', 'Deep Breathing Cooldown'] },
    ],
  },
  {
    levelNumber: 2,
    title: 'Build',
    description: 'Progressive strengthening for a resilient back.',
    days: [
      { dayNumber: 1, title: 'L2 Day 1 — Build', titles: ['Cat-Cow Stretch', 'Bird Dog', 'Superman Hold', 'Deep Breathing Cooldown'] },
      { dayNumber: 2, title: 'L2 Day 2 — Lower Body', titles: ['Gentle Neck Rolls', 'Glute Bridge', 'Wall Sit', 'Deep Breathing Cooldown'] },
      { dayNumber: 3, title: 'L2 Day 3 — Progress', titles: ['Bird Dog', 'Superman Hold', 'Standing Quad Stretch', 'Deep Breathing Cooldown'] },
      { dayNumber: 4, title: 'L2 Day 4 — Rest', isRestDay: true },
      { dayNumber: 5, title: 'L2 Day 5 — Strength', titles: ['Glute Bridge', 'Wall Sit', 'Superman Hold', 'Deep Breathing Cooldown'] },
    ],
  },
];

// SHORT programs stay FLAT (no levels).
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

async function upsertLevelsAndDays(
  programId: Types.ObjectId,
  levels: LevelSpec[],
  idByTitle: Map<string, Types.ObjectId>
): Promise<void> {
  for (const level of levels) {
    await ProgramLevel.updateOne(
      { program: programId, levelNumber: level.levelNumber },
      {
        $set: {
          program: programId,
          levelNumber: level.levelNumber,
          title: level.title,
          description: level.description,
        },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await upsertDays(programId, level.days, idByTitle, level.levelNumber);
  }
}

async function upsertDays(
  programId: Types.ObjectId,
  specs: DaySpec[],
  idByTitle: Map<string, Types.ObjectId>,
  levelNumber?: number
): Promise<void> {
  for (const spec of specs) {
    const exercises = (spec.titles ?? []).map((title, index) => {
      const id = idByTitle.get(title);
      if (!id) throw new Error(`Seed exercise missing: ${title}`);
      const isEnd = index === 0 || index === (spec.titles!.length - 1);
      return { exercise: id, order: index, sets: isEnd ? undefined : 2 };
    });
    await ProgramDay.updateOne(
      { program: programId, levelNumber: levelNumber ?? null, dayNumber: spec.dayNumber },
      {
        $set: {
          program: programId,
          ...(levelNumber !== undefined ? { levelNumber } : {}),
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

  // The unique index changed in M2.5-L ({program, dayNumber} → {program,
  // levelNumber, dayNumber}); sync so stale dev DBs drop the old one.
  await ProgramDay.syncIndexes();
  await ProgramLevel.syncIndexes();

  const allTitles = [
    ...new Set([
      ...WEIGHT_LOSS_LEVELS.flatMap((l) => l.days.flatMap((d) => d.titles ?? [])),
      ...BACK_REHAB_LEVELS.flatMap((l) => l.days.flatMap((d) => d.titles ?? [])),
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

  // Program A — Weight Loss Kickstart (2 levels × 5 days)
  const weightLossId = await upsertProgram(
    { name: 'Weight Loss Kickstart' },
    {
      type: 'STANDARD',
      name: 'Weight Loss Kickstart',
      description: 'A leveled full-body plan to build the exercise habit and burn calories.',
      durationDays: 10, // mirrors authored content: 2 levels × 5 days
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
  await upsertLevelsAndDays(weightLossId, WEIGHT_LOSS_LEVELS, idByTitle);

  // Program B — Lower Back Rehab (2 levels × 5 days)
  const backRehabId = await upsertProgram(
    { name: 'Lower Back 90-Day Rehab' },
    {
      type: 'STANDARD',
      name: 'Lower Back 90-Day Rehab',
      description: 'A gentle leveled program to relieve lower-back pain and rebuild core stability.',
      durationDays: 10, // mirrors authored content: 2 levels × 5 days
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
  await upsertLevelsAndDays(backRehabId, BACK_REHAB_LEVELS, idByTitle);

  // SHORT standalone flat programs (no levels, no enrollment). Published so the
  // app can list them via GET /programs?type=SHORT ("only got 5 minutes?").
  const shortSpecs = [
    {
      shortCode: 'SP-001',
      name: 'Sitting Lower Back Relief',
      description: 'A short standalone lower-back relief routine.',
      targetAreas: ['lower_back'],
      day: SHORT_DAY,
    },
    {
      shortCode: 'SP-002',
      name: 'Neck & Shoulder Reset',
      description: 'Release desk tension in a few minutes.',
      targetAreas: ['neck', 'upper_back'],
      day: {
        dayNumber: 1,
        title: 'Neck & Shoulder Reset',
        titles: ['Gentle Neck Rolls', 'Cat-Cow Stretch', 'Deep Breathing Cooldown'],
      } as DaySpec,
    },
    {
      shortCode: 'SP-003',
      name: 'Quick Breath',
      description: 'A short breathing reset to calm the nervous system.',
      targetAreas: ['full_body'],
      day: {
        dayNumber: 1,
        title: 'Quick Breath',
        titles: ['Deep Breathing Cooldown'],
      } as DaySpec,
    },
  ];

  const shortIds: Types.ObjectId[] = [];
  for (const spec of shortSpecs) {
    const id = await upsertProgram(
      { shortCode: spec.shortCode },
      {
        type: 'SHORT',
        name: spec.name,
        description: spec.description,
        shortCode: spec.shortCode,
        targetAreas: spec.targetAreas,
        genderFilter: 'all',
        isActive: true,
        isPublished: true,
      }
    );
    await upsertDays(id, [spec.day], idByTitle);
    shortIds.push(id);
  }
  const shortId = shortIds[0];

  logger.info(
    `✅ Seeded leveled programs: Weight Loss Kickstart (${weightLossId}), ` +
      `Lower Back 90-Day Rehab (${backRehabId}) — 2 levels × 5 days each; ` +
      `${shortIds.length} SHORT programs (first: ${shortId}) flat + published.`
  );
  await disconnectDB();
  process.exit(0);
}

seed().catch((err: Error) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
