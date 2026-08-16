/**
 * Unpublish the demo-seed programmes.
 *
 * The patient catalogue was showing 74 programmes when the clinic had authored
 * exactly one. That was never a query bug — `listPublishedPrograms` correctly
 * filters on `isPublished`. The demo seed simply created its programmes with
 * `isPublished: true`, so they were, by the only definition the code has, live.
 *
 * The seed programmes are identifiable because they have NO ProgramLevel rows:
 * every authored programme is built as Program → Level → Day, while the seed
 * produced flat day lists. That is a far safer signal than a date or a name.
 *
 * UNPUBLISH, never delete:
 *  - patients are enrolled in some of these; deleting the programme would
 *    orphan their enrollment, their sessions and their progress records,
 *  - it is one field, so it is trivially reversible,
 *  - unpublishing removes them from browse, search and recommendations, which
 *    is the entire problem. It does NOT interrupt anyone mid-programme.
 *
 *   npx tsx src/scripts/unpublishSeedPrograms.ts          # report only
 *   npx tsx src/scripts/unpublishSeedPrograms.ts --write  # apply
 *   npx tsx src/scripts/unpublishSeedPrograms.ts --undo   # put them back
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Program } from '../models/program.model';
import { ProgramLevel } from '../models/programLevel.model';
import { Enrollment } from '../models/enrollment.model';

const APPLY = process.argv.includes('--write');
const UNDO = process.argv.includes('--undo');

async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);

  const levelled = new Set((await ProgramLevel.distinct('program')).map(String));

  // On undo we are looking for the ones we previously hid, which are by
  // definition NOT published any more — so the flag we select on flips too.
  const scope = await Program.find({ isPublished: !UNDO, isActive: true })
    .select('name')
    .lean();

  const keep = scope.filter((p) => levelled.has(String(p._id)));
  const drop = scope.filter((p) => !levelled.has(String(p._id)));

  console.log(UNDO ? '── UNDO ──' : APPLY ? '── APPLYING ──' : '── DRY RUN (--write to apply) ──');
  console.log(`\n${UNDO ? 'already-published (has levels)' : 'keeping published (has levels)'}: ${keep.length}`);
  for (const p of keep) console.log(`   ${p.name as string}`);
  console.log(`\nunpublishing (no levels):       ${drop.length}`);

  // Anyone actually on one of these needs a human decision, so surface them
  // rather than quietly changing what they see.
  const ids = drop.map((p) => p._id);
  const active = await Enrollment.find({ program: { $in: ids }, status: 'ACTIVE' })
    .select('user program')
    .populate<{ program: { name?: string } }>('program', 'name')
    .lean();

  if (active.length > 0) {
    console.log(`\n⚠ ${active.length} ACTIVE enrollment(s) are on these programmes.`);
    console.log('  They keep their current plan — unpublishing only hides it from browse.');
    for (const e of active) {
      console.log(`   user ${String(e.user)} → ${e.program?.name ?? '(unnamed)'}`);
    }
  }

  if (APPLY || UNDO) {
    const res = await Program.updateMany(
      { _id: { $in: ids } },
      { $set: { isPublished: UNDO } }
    );
    console.log(`\n${UNDO ? 'republished' : 'unpublished'}: ${res.modifiedCount}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err: Error) => {
  console.error('FAILED:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
