/**
 * Backfill `enrollment` on Session and ProgressDay.
 *
 * Both models gained an `enrollment` reference so that each RUN of a program
 * keeps its own exercise history: switching programs always restarts at day 1,
 * so `program` alone cannot tell a second attempt from the first. Records
 * written before that change have the field unset, and any read that scopes to
 * the current enrollment would simply not see them.
 *
 * Safe to run repeatedly:
 *  - only touches documents where `enrollment` is missing,
 *  - only writes when EXACTLY ONE enrollment matches the user+program pair, so
 *    an ambiguous row is reported and skipped rather than guessed at,
 *  - additive; nothing is deleted or overwritten.
 *
 *   npx tsx src/scripts/backfillEnrollmentRefs.ts          # report only
 *   npx tsx src/scripts/backfillEnrollmentRefs.ts --write  # apply
 */
import mongoose, { type Model } from 'mongoose';
import { env } from '../config/env';
import { Session } from '../models/session.model';
import { ProgressDay } from '../models/progressDay.model';
import { Enrollment } from '../models/enrollment.model';

const APPLY = process.argv.includes('--write');

interface Tally {
  matched: number;
  ambiguous: number;
  noEnrollment: number;
  noProgram: number;
}

/**
 * `Model<any>` on purpose: Session and ProgressDay have different document
 * types, and a union of the two makes every query overload ambiguous. Only the
 * two fields read here (`user`, `program`) are common to both, and they are
 * narrowed explicitly below.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function backfill(label: string, model: Model<any>): Promise<Tally> {
  const t: Tally = { matched: 0, ambiguous: 0, noEnrollment: 0, noProgram: 0 };
  const docs = await model
    .find({ enrollment: { $exists: false } })
    .select('user program')
    .lean();

  for (const d of docs as { _id: unknown; user: unknown; program?: unknown }[]) {
    if (!d.program) {
      // SHORT-program sessions never enroll; they legitimately have none.
      t.noProgram++;
      continue;
    }
    const rows = await Enrollment.find({
      user: d.user as mongoose.Types.ObjectId,
      program: d.program as mongoose.Types.ObjectId,
    })
      .select('_id')
      .lean();

    if (rows.length === 0) {
      t.noEnrollment++;
      continue;
    }
    if (rows.length > 1) {
      // Two runs of the same program and no way to tell which this belongs to.
      // Guessing would put a day in the wrong run, which is worse than leaving
      // it unattributed — so report it and move on.
      t.ambiguous++;
      console.log(`  AMBIGUOUS ${label} ${String(d._id)} — ${rows.length} enrollments match`);
      continue;
    }
    t.matched++;
    if (APPLY) {
      await model.updateOne({ _id: d._id }, { $set: { enrollment: rows[0]!._id } });
    }
  }
  return t;
}

async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log(APPLY ? '── APPLYING ──\n' : '── DRY RUN (pass --write to apply) ──\n');

  for (const [label, model] of [
    ['Session', Session],
    ['ProgressDay', ProgressDay],
  ] as const) {
    const t = await backfill(label, model);
    console.log(
      `${label.padEnd(12)} matched=${t.matched} ambiguous=${t.ambiguous} ` +
        `no-enrollment=${t.noEnrollment} no-program(SHORT)=${t.noProgram}`
    );
  }

  await mongoose.disconnect();
}

main().catch(async (err: Error) => {
  console.error('FAILED:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
