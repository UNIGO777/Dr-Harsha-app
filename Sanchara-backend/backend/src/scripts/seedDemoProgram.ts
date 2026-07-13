import { connectDB, disconnectDB } from '../config/db';
import { Exercise } from '../models/exercise.model';
import { Program } from '../models/program.model';
import { logger } from '../utils/logger';

/**
 * Dev seed: a SHORT program (SP-001) built from the sample exercises so a full
 * session can be run end-to-end without the (not-yet-built) programs module.
 * Idempotent — upserts by shortCode. Run `npm run seed:exercises` first.
 *
 * Run with:  npm run seed:demo-program
 */

// Ordered by intended flow; MEDIUM Bird Dog enables the Too Hard → easier demo.
const ORDERED_TITLES = [
  'Cat-Cow Stretch', // EASY  lower_back
  'Bird Dog', // MEDIUM lower_back
  'Glute Bridge', // MEDIUM lower_back/glutes
  'Deep Breathing Cooldown', // EASY  full_body (cooldown)
];

async function seed(): Promise<void> {
  await connectDB();

  const docs = await Exercise.find({ title: { $in: ORDERED_TITLES } }).select('_id title');
  const idByTitle = new Map(docs.map((d) => [d.title, d._id]));

  const missing = ORDERED_TITLES.filter((t) => !idByTitle.has(t));
  if (missing.length > 0) {
    logger.error(`Missing seed exercises: ${missing.join(', ')}. Run "npm run seed:exercises" first.`);
    await disconnectDB();
    process.exit(1);
  }

  const exercises = ORDERED_TITLES.map((title, order) => ({
    exercise: idByTitle.get(title),
    order,
  }));

  await Program.updateOne(
    { shortCode: 'SP-001' },
    {
      $set: {
        type: 'SHORT',
        name: 'Sitting Lower Back Relief',
        description: 'A short lower-back relief program for all users.',
        shortCode: 'SP-001',
        genderFilter: 'all',
        isActive: true,
        exercises,
      },
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const program = await Program.findOne({ shortCode: 'SP-001' }).select('_id');
  logger.info(`✅ Seeded SHORT program SP-001 (${program?._id}) with ${exercises.length} exercises.`);
  await disconnectDB();
  process.exit(0);
}

seed().catch((err: Error) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
