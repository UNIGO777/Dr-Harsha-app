import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Ban, CircleCheck, Layers, ShieldCheck } from 'lucide-react';

import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, Spinner } from '@/components/ui';
import {
  usePatientDetail,
  useSetPatientLevel,
  useSetPatientStatus,
  type AccountStatus,
  type PatientDetail,
} from '@/features/patients/api';
import { useProgramDetail } from '@/features/programs/api';

/**
 * Patient record for clinical staff.
 *
 * Blocking a patient and overriding their difficulty tier are both available
 * here — audited, reversible, and each requiring a written reason. Assigning a
 * different program still needs its own audited endpoint, so it is deliberately
 * absent rather than faked.
 */
export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = usePatientDetail(id);
  const [statusChange, setStatusChange] = useState<AccountStatus | null>(null);
  const [levelChange, setLevelChange] = useState(false);

  if (detail.isLoading) return <Spinner />;
  if (detail.error || !detail.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ErrorState
          message={errorMessage(detail.error, 'Could not load this patient')}
          onRetry={detail.refetch}
        />
      </div>
    );
  }

  const p = detail.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        to="/patients"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All patients
      </Link>

      <PageHeader
        title={p.name ?? 'Unnamed patient'}
        subtitle={`${p.phone}${p.email ? ` · ${p.email}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={p.accountStatus === 'active' ? 'mint' : 'amber'}>{p.accountStatus}</Badge>
            {p.group && <Badge>{p.group}</Badge>}

            {p.accountStatus === 'locked' ? (
              <Button variant="secondary" onClick={() => setStatusChange('active')}>
                <CircleCheck className="h-4 w-4" />
                Unblock
              </Button>
            ) : (
              <>
                {p.accountStatus === 'waitlisted' && (
                  <Button variant="secondary" onClick={() => setStatusChange('active')}>
                    <ShieldCheck className="h-4 w-4" />
                    Approve access
                  </Button>
                )}
                <Button variant="danger" onClick={() => setStatusChange('locked')}>
                  <Ban className="h-4 w-4" />
                  Block
                </Button>
              </>
            )}
          </div>
        }
      />

      {p.accountStatus === 'locked' && (
        <div className="mt-5 rounded-card border border-danger/40 bg-danger/8 px-4 py-3">
          <p className="text-sm text-danger">
            This patient is blocked — sessions, programs and videos are all refused until they are
            unblocked. Their account and history are untouched.
          </p>
        </div>
      )}

      {/* Safety overrides come first — the most clinically urgent thing here. */}
      {p.safetyOverrides.length > 0 && (
        <div className="mt-6 rounded-card border border-amber/40 bg-amber/8 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber" />
            <p className="font-medium text-amber">
              {p.safetyOverrides.length} safety override
              {p.safetyOverrides.length > 1 ? 's' : ''}
            </p>
          </div>
          <p className="mt-1 text-xs text-ink-dim">
            Sessions this patient chose to start despite reporting high pain (8+).
          </p>
          <ul className="mt-3 space-y-1.5">
            {p.safetyOverrides.map((o) => (
              <li key={o.at} className="text-sm text-ink-dim">
                <span className="text-ink">{new Date(o.at).toLocaleDateString()}</span>
                {o.maxScore !== undefined && ` · pain ${o.maxScore}/10`}
                {o.reason && ` · "${o.reason}"`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Profile */}
      <Section title="Profile">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4 text-sm">
          <Field label="Age" value={p.age ? `${p.age}` : '—'} />
          <Field label="Gender" value={p.gender ?? '—'} />
          <Field label="Height" value={p.heightCm ? `${p.heightCm} cm` : '—'} />
          <Field label="Weight" value={p.weightKg ? `${p.weightKg} kg` : '—'} />
          <Field label="BMI" value={p.bmi ? String(p.bmi) : '—'} />
          <Field label="Max HR" value={p.maxHr ? String(p.maxHr) : '—'} />
          <Field label="Experience" value={p.exerciseHistory ?? '—'} />
          <Field label="Difficulty level" value={String(p.level)} />
        </dl>
        {p.goal && (
          <p className="mt-4 text-sm">
            <span className="label-micro">Goal</span>
            <span className="mt-1 block text-ink">{p.goal}</span>
          </p>
        )}
      </Section>

      {/* Clinical */}
      <Section title="Clinical">
        <TagRow label="Pain areas" values={p.painAreas} />
        <TagRow label="Conditions" values={p.conditions} />
        {p.surgeryHistory && (
          <div className="mt-3">
            <span className="label-micro">Surgery history</span>
            <p className="mt-1 text-sm text-ink">{p.surgeryHistory}</p>
          </div>
        )}
      </Section>

      {/* Progress */}
      <Section title="Program progress">
        {p.enrollment ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">
                  {p.enrollment.program?.name ?? 'Program'}
                </p>
                <p className="mt-0.5 text-sm text-ink-dim">
                  Level {p.enrollment.currentLevel}
                  {p.enrollment.totalLevels > 0 && ` of ${p.enrollment.totalLevels}`} · Day{' '}
                  {p.enrollment.currentDay}
                  {p.enrollment.completedLevels.length > 0 &&
                    ` · ${p.enrollment.completedLevels.length} level(s) complete`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={p.enrollment.status === 'ACTIVE' ? 'mint' : 'neutral'}>
                  {p.enrollment.status}
                </Badge>
                {/* Levels are difficulty tiers the patient chose, and nothing
                    promotes them automatically — so this override is the only
                    way someone moves between them clinically. */}
                {p.enrollment.status === 'ACTIVE' && p.enrollment.totalLevels > 0 && (
                  <Button variant="ghost" onClick={() => setLevelChange(true)}>
                    <Layers size={15} /> Change level
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-hi">
              <div
                className="h-full rounded-full bg-mint"
                style={{ width: `${p.enrollment.percentComplete}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">
              {p.enrollment.percentComplete}% complete · {p.weeklyActivity.currentMinutes} min this
              week
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-dim">Not enrolled in a program yet.</p>
        )}
      </Section>

      {/* Sessions */}
      <Section title="Recent sessions">
        {p.recentSessions.length === 0 ? (
          <EmptyState title="No sessions yet" note="This patient hasn't completed a workout." />
        ) : (
          <ul className="divide-y divide-edge">
            {p.recentSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <span className="text-ink">
                    {s.levelNumber ? `Level ${s.levelNumber} · ` : ''}
                    {s.dayNumber ? `Day ${s.dayNumber}` : 'Session'}
                  </span>
                  <span className="ml-2 text-xs text-ink-faint">
                    {s.date ? new Date(s.date).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-ink-dim">
                  <span className="text-xs">{Math.round(s.durationSeconds / 60)} min</span>
                  {s.avgEaseScore !== undefined && (
                    <span className="text-xs">ease {s.avgEaseScore}/10</span>
                  )}
                  <Badge tone={s.completion === 'COMPLETED' ? 'mint' : 'amber'}>
                    {s.completion ?? '—'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Pain trend */}
      <Section title="Pain trend">
        {Object.keys(p.trends.painByArea).length === 0 ? (
          <p className="text-sm text-ink-dim">
            No pain check-ins recorded yet — these appear once the patient starts sessions.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(p.trends.painByArea).map(([area, points]) => (
              <PainSeries key={area} area={area} points={points} />
            ))}
          </div>
        )}
      </Section>

      <p className="mt-8 text-center text-xs text-ink-faint">
        Assigning a different program needs its own audited endpoint — not built yet.
      </p>

      {statusChange && (
        <StatusModal
          patientId={p.id}
          patientName={p.name ?? 'this patient'}
          target={statusChange}
          onClose={() => setStatusChange(null)}
        />
      )}

      {levelChange && p.enrollment && (
        <LevelModal
          patientId={p.id}
          patientName={p.name ?? 'this patient'}
          programId={p.enrollment.programId}
          currentLevel={p.enrollment.currentLevel}
          onClose={() => setLevelChange(false)}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-card border border-edge bg-surface p-5">
      <h2 className="label-micro mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-micro">{label}</dt>
      <dd className="mt-1 capitalize text-ink">{value}</dd>
    </div>
  );
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <span className="label-micro">{label}</span>
      {values.length === 0 ? (
        <p className="mt-1 text-sm text-ink-faint">None reported</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v}>{v}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sparkline of pain scores for one body area, oldest → newest. */
function PainSeries({
  area,
  points,
}: {
  area: string;
  points: PatientDetail['trends']['painByArea'][string];
}) {
  const W = 420;
  const H = 40;
  const scores = points.map((p) => p.score);
  const latest = scores[scores.length - 1] ?? 0;
  const first = scores[0] ?? 0;
  const delta = latest - first;

  const path = points
    .map((p, i) => {
      const x = points.length === 1 ? 0 : (i / (points.length - 1)) * W;
      // Pain runs 0–10; invert so a lower (better) score sits higher.
      const y = H - (p.score / 10) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-ink">{area}</span>
        <span className="text-xs text-ink-dim">
          now {latest}/10
          {points.length > 1 && (
            <span className={delta <= 0 ? 'text-mint' : 'text-amber'}>
              {' '}
              ({delta > 0 ? '+' : ''}
              {delta} since first)
            </span>
          )}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="rounded bg-surface-hi/40">
        <polyline
          points={path}
          fill="none"
          stroke={delta <= 0 ? 'var(--color-mint)' : 'var(--color-amber)'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * Confirms a block / unblock / waitlist approval and captures the mandatory
 * reason. The backend rejects the change without one and writes it to the
 * immutable audit log.
 */
function StatusModal({
  patientId,
  patientName,
  target,
  onClose,
}: {
  patientId: string;
  patientName: string;
  target: AccountStatus;
  onClose: () => void;
}) {
  const setStatus = useSetPatientStatus(patientId);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const blocking = target === 'locked';

  return (
    <Modal
      title={blocking ? `Block ${patientName}?` : `Restore access for ${patientName}?`}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await setStatus.mutateAsync({ accountStatus: target, reason });
            onClose();
          } catch (err) {
            setError(errorMessage(err, 'Could not change the status'));
          }
        }}
      >
        <p className="text-sm text-ink-dim">
          {blocking
            ? 'They will be unable to start sessions or open any program or video. Their account, history and progress are preserved, and you can unblock at any time.'
            : 'They will immediately regain access to their program and sessions.'}
        </p>

        <Input
          label="Reason (recorded in the audit log)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            blocking ? 'e.g. Paused pending clinical review' : 'e.g. Review complete, cleared to resume'
          }
          required
          autoFocus
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={blocking ? 'danger' : 'primary'}
            busy={setStatus.isPending}
            disabled={reason.trim().length < 3}
          >
            {blocking ? 'Block patient' : 'Restore access'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Moves a patient to a different difficulty tier.
 *
 * Levels are tiers the PATIENT picked when starting ("easy" / "Medium" /
 * "Hard"), and nothing promotes them automatically — so this is the clinical
 * override for when the tier they chose is wrong for them.
 *
 * The reset warning is stated plainly rather than buried: day 3 of "easy" and
 * day 3 of "Hard" are different work, so the day counter cannot carry across
 * without skipping days the patient has never done.
 */
function LevelModal({
  patientId,
  patientName,
  programId,
  currentLevel,
  onClose,
}: {
  patientId: string;
  patientName: string;
  programId: string;
  currentLevel: number;
  onClose: () => void;
}) {
  const setLevel = useSetPatientLevel(patientId);
  const { data: program, isLoading } = useProgramDetail(programId);
  const [target, setTarget] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const levels = program?.levels ?? [];

  return (
    <Modal title={`Change level for ${patientName}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (target === null) return;
          try {
            await setLevel.mutateAsync({ levelNumber: target, reason });
            onClose();
          } catch (err) {
            setError(errorMessage(err, 'Could not change the level'));
          }
        }}
      >
        <p className="text-sm text-ink-dim">
          Their day progress at this level will reset to Day 1. Completed sessions stay in their
          record.
        </p>

        {isLoading ? (
          <Spinner />
        ) : levels.length === 0 ? (
          <p className="text-sm text-ink-dim">This program has no levels to choose from.</p>
        ) : (
          <div className="space-y-2">
            {levels.map((l) => {
              const isCurrent = l.levelNumber === currentLevel;
              const selected = l.levelNumber === target;
              return (
                <button
                  key={l.levelNumber}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setTarget(l.levelNumber)}
                  className={[
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition',
                    isCurrent
                      ? 'cursor-not-allowed border-surface-hi bg-surface-hi/40 opacity-60'
                      : selected
                        ? 'border-mint bg-mint/10'
                        : 'border-surface-hi hover:border-mint/50',
                  ].join(' ')}
                >
                  <span className="text-sm text-ink">
                    Level {l.levelNumber}
                    {l.title ? ` · ${l.title}` : ''}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {isCurrent ? 'current' : `${l.dayCount} day${l.dayCount === 1 ? '' : 's'}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <Input
          label="Reason (recorded in the audit log)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Reported too easy for two weeks"
          required
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            busy={setLevel.isPending}
            disabled={target === null || reason.trim().length < 3}
          >
            Change level
          </Button>
        </div>
      </form>
    </Modal>
  );
}
