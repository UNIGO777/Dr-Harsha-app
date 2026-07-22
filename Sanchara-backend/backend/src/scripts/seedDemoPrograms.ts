import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { Exercise } from '../models/exercise.model';
import { Program } from '../models/program.model';
import { ProgramDay } from '../models/programDay.model';
import { logger } from '../utils/logger';

/**
 * DEMO seed — bulk test data so the program browse / recommendation / detail
 * screens can be exercised with a realistic catalog.
 *
 *   - 120 published STANDARD programs with varied tags + real photo thumbnails
 *   - ~8 ProgramDays each (incl. a rest day), reusing the sample exercises
 *   - deterministic + idempotent: marked with shortCode "DEMO-<n>", wiped and
 *     recreated on each run. Does NOT touch the hand-authored real programs.
 *
 * Run `npm run seed:exercises` (and ideally `npm run seed:programs`) first.
 */

const COUNT = 120;

// Real, stable Unsplash CDN images (fitness / yoga / wellness). The frontend
// falls back to a gradient for any that don't load.
const IMAGES = [
  '1517836357463-d25dfeac3438',
  '1544367567-0f2fcb009e0b',
  '1571019613454-1cb2f99b2d8b',
  '1518611012118-696072aa579a',
  '1534438327276-14e5300c3a48',
  '1540206395-68808572332f',
  '1550345332-09e3ac987658',
  '1506126613408-eca07ce68773',
  '1552196563-55cd4e45efb3',
  '1571902943202-507ec2618e8f',
  '1594381898411-846e7d193883',
  '1518310383802-640c2de311b2',
  '1538805060514-97d9cc17730c',
  '1517838277536-f5f99be501cd',
  '1599058917212-d750089bc07e',
].map((id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`);

const NAME_A = [
  'Restorative', 'Gentle', 'Dynamic', 'Foundational', 'Morning', 'Evening', 'Core',
  'Total Body', 'Spinal', 'Joint', 'Mobility', 'Strength', 'Recovery', 'Posture',
  'Balance', 'Flexibility', 'Therapeutic', 'Mindful', 'Active', 'Lower Back',
];
const NAME_B = ['Flow', 'Reset', 'Program', 'Journey', 'Protocol', 'Series', 'Routine', 'Rehab', 'Builder', 'Release', 'Foundations', 'Method'];

const GOALS = ['pain_relief', 'weight_loss', 'fitness', 'mobility', 'strength', 'flexibility', 'recovery', 'posture', 'core_stability', 'endurance'];
const AREAS = ['lower_back', 'neck', 'shoulders', 'hips', 'knees', 'core', 'full_body', 'spine', 'legs', 'upper_back'];
const CONDITIONS = ['back_pain', 'hypertension', 'diabetes', 'arthritis', 'obesity', 'none'];
const DIFFS = ['EASY', 'MEDIUM', 'HARD'] as const;
const DURATIONS = [15, 21, 30, 45, 60, 90];
const AGE_SETS = [['GROUP_1'], ['GROUP_2'], ['GROUP_1', 'GROUP_2']];

/** Deterministic pick so re-runs are stable. */
const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length]!;
const pickN = <T,>(arr: T[], i: number, n: number): T[] => {
  const out: T[] = [];
  for (let k = 0; k < n; k++) out.push(arr[(i + k * 3) % arr.length]!);
  return [...new Set(out)];
};

async function seed(): Promise<void> {
  await connectDB();

  const exercises = await Exercise.find().select('_id');
  if (exercises.length === 0) {
    logger.error('No exercises found. Run "npm run seed:exercises" first.');
    await disconnectDB();
    process.exit(1);
  }
  const exIds = exercises.map((e) => e._id);

  // Wipe previous demo programs + their days (idempotent).
  const old = await Program.find({ shortCode: /^DEMO-/ }).select('_id');
  const oldIds = old.map((p) => p._id);
  if (oldIds.length) {
    await ProgramDay.deleteMany({ program: { $in: oldIds } });
    await Program.deleteMany({ _id: { $in: oldIds } });
  }

  // Build programs.
  const programDocs = Array.from({ length: COUNT }, (_, i) => ({
    _id: new Types.ObjectId(),
    type: 'STANDARD' as const,
    name: `${pick(NAME_A, i)} ${pick(NAME_B, i + 1)}${i >= NAME_A.length * NAME_B.length ? ` ${Math.floor(i / 20) + 1}` : ''}`,
    description:
      'A medically-guided movement program designed to help you build strength, ease stiffness, and move with confidence — progressing safely day by day.',
    durationDays: pick(DURATIONS, i),
    isPublished: true,
    isActive: true,
    thumbnailUrl: pick(IMAGES, i),
    goalTag: pickN(GOALS, i, 2),
    suitableConditions: pickN(CONDITIONS, i + 1, 2),
    targetAreas: pickN(AREAS, i, 3),
    difficultyLevel: pick(DIFFS, i),
    ageGroups: pick(AGE_SETS, i),
    genderFilter: 'all' as const,
    shortCode: `DEMO-${i + 1}`,
  }));
  await Program.insertMany(programDocs);

  // Build ~8 days each (day 4 = rest), reusing exercises.
  const dayDocs: Record<string, unknown>[] = [];
  for (let p = 0; p < programDocs.length; p++) {
    const prog = programDocs[p]!;
    for (let d = 1; d <= 8; d++) {
      const isRest = d === 4;
      const exercises_ = isRest
        ? []
        : Array.from({ length: 4 }, (_, k) => ({
            exercise: exIds[(p + d + k) % exIds.length],
            order: k,
            sets: k === 0 || k === 3 ? undefined : 2,
          }));
      dayDocs.push({
        program: prog._id,
        dayNumber: d,
        title: isRest ? `Day ${d} — Active Recovery` : `Day ${d} — Session`,
        isRestDay: isRest,
        exercises: exercises_,
      });
    }
  }
  await ProgramDay.insertMany(dayDocs);

  logger.info(`✅ Seeded ${COUNT} demo programs (${dayDocs.length} days) with image thumbnails.`);
  await disconnectDB();
  process.exit(0);
}

seed().catch((err: Error) => {
  logger.error(`Demo seed failed: ${err.message}`);
  process.exit(1);
});
