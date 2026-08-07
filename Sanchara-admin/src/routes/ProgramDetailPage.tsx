import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Coffee,
  Film,
  Layers,
  Pencil,
  Plus,
  Snowflake,
  Trash2,
  Flame,
} from 'lucide-react';

import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/PageHeader';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Spinner,
} from '@/components/ui';
import {
  useCreateDay,
  useCreateLevel,
  useDeleteDay,
  useDeleteLevel,
  useExerciseOptions,
  useProgramDetail,
  useSetPublished,
  type AdminDay,
  type ExerciseOption,
} from '@/features/programs/api';
import { ProgramFormModal } from '@/routes/ProgramForm';

/**
 * One slot in a day's running order. Carries its own `slotId` because the same
 * exercise may appear more than once in a day, so the exercise id alone can't
 * identify a row (or key it in React).
 */
type PickedExercise = ExerciseOption & { slotId: string };

/**
 * Program authoring view: Program → Level → Day → Exercises.
 *
 * The hierarchy is enforced in the UI: days can only be created INSIDE a level,
 * so a program with no levels prompts you to create one first. The exception is
 * SHORT programs, which are standalone by design and stay flat (Program → Day).
 */
export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useProgramDetail(id);
  const setPublished = useSetPublished();

  const [editing, setEditing] = useState(false);
  const [addingLevel, setAddingLevel] = useState(false);
  const [addingDayTo, setAddingDayTo] = useState<{
    levelNumber?: number;
    /** Opens the modal with "rest day" already ticked. */
    rest?: boolean;
  } | null>(null);

  if (detail.isLoading) return <Spinner />;
  if (detail.error || !detail.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ErrorState
          message={errorMessage(detail.error, 'Could not load this program')}
          onRetry={detail.refetch}
        />
      </div>
    );
  }

  const program = detail.data;
  const hasLevels = program.levels.length > 0;
  const isFlatByDesign = program.type === 'SHORT';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        to="/programs"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All programs
      </Link>

      <PageHeader
        title={program.name ?? 'Untitled program'}
        subtitle={program.description}
        action={
          <div className="flex items-center gap-2">
            {program.isPublished ? (
              <Badge tone="mint">Published</Badge>
            ) : (
              <Badge tone="amber">Draft</Badge>
            )}
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="secondary"
              busy={setPublished.isPending}
              onClick={() =>
                setPublished.mutate({ id: program.id, isPublished: !program.isPublished })
              }
            >
              {program.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        }
      />

      {program.thumbnailImageUrl && (
        <img
          src={program.thumbnailImageUrl}
          alt=""
          className="mt-5 h-36 w-full rounded-card object-cover sm:h-44"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}

      {/* Meta */}
      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 rounded-card border border-edge bg-surface p-5 text-sm">
        <Meta label="Type" value={program.type} />
        <Meta label="Duration" value={program.durationDays ? `${program.durationDays} days` : '—'} />
        <Meta label="Difficulty" value={program.difficultyLevel ?? '—'} />
        <Meta label="Content" value={`${program.levels.length} levels · ${program.dayCount} days`} />
      </dl>

      {/* Tags */}
      {(program.goalTag.length > 0 || program.targetAreas.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {program.goalTag.map((t) => (
            <Badge key={t} tone="mint">
              {t}
            </Badge>
          ))}
          {program.targetAreas.map((t) => (
            <Badge key={t}>{t.replace(/_/g, ' ')}</Badge>
          ))}
        </div>
      )}

      {/* Content tree */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="label-micro">Content</h2>
        {isFlatByDesign ? (
          <Button variant="secondary" onClick={() => setAddingDayTo({})}>
            <Plus className="h-4 w-4" />
            Add day
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setAddingLevel(true)}>
            <Layers className="h-4 w-4" />
            Add level
          </Button>
        )}
      </div>

      <div className="mt-3 space-y-4">
        {program.levels.map((level) => (
          <LevelCard
            key={level.id}
            programId={program.id}
            levelId={level.id}
            levelNumber={level.levelNumber}
            title={level.title}
            days={level.days}
            onAddDay={() => setAddingDayTo({ levelNumber: level.levelNumber })}
            onAddRestDay={() => setAddingDayTo({ levelNumber: level.levelNumber, rest: true })}
          />
        ))}

        {/* Flat days — only SHORT programs should have these. */}
        {program.days.length > 0 && (
          <div className="rounded-card border border-edge bg-surface p-5">
            <p className="label-micro mb-3">
              {isFlatByDesign ? 'Days' : 'Days outside any level'}
            </p>
            {!isFlatByDesign && (
              <p className="mb-3 text-xs text-amber">
                These were created before this program had levels. Move or delete them — patients
                progress level by level.
              </p>
            )}
            <DayList programId={program.id} days={program.days} />
          </div>
        )}

        {/* Empty states steer you to the right first step. */}
        {!hasLevels && program.days.length === 0 && (
          <EmptyState
            title={isFlatByDesign ? 'No days yet' : 'Start with a level'}
            note={
              isFlatByDesign
                ? 'Short programs are standalone — add the day and its exercises.'
                : 'Days live inside levels. Create Level 1, then add its days.'
            }
          />
        )}
      </div>

      {editing && <ProgramFormModal program={program} onClose={() => setEditing(false)} />}
      {addingLevel && (
        <AddLevelModal
          programId={program.id}
          nextNumber={program.levels.length + 1}
          onClose={() => setAddingLevel(false)}
        />
      )}
      {addingDayTo && (
        <AddDayModal
          programId={program.id}
          levelNumber={addingDayTo.levelNumber}
          levelTitle={
            program.levels.find((l) => l.levelNumber === addingDayTo.levelNumber)?.title
          }
          defaultRestDay={addingDayTo.rest ?? false}
          nextDayNumber={
            (addingDayTo.levelNumber !== undefined
              ? (program.levels.find((l) => l.levelNumber === addingDayTo.levelNumber)?.days
                  .length ?? 0)
              : program.days.length) + 1
          }
          onClose={() => setAddingDayTo(null)}
        />
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-micro">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}

function LevelCard({
  programId,
  levelId,
  levelNumber,
  title,
  days,
  onAddDay,
  onAddRestDay,
}: {
  programId: string;
  levelId: string;
  levelNumber: number;
  title?: string;
  days: AdminDay[];
  onAddDay: () => void;
  onAddRestDay: () => void;
}) {
  const deleteLevel = useDeleteLevel(programId);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-card border border-edge bg-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge tone="mint">LEVEL {String(levelNumber).padStart(2, '0')}</Badge>
          <p className="font-medium text-ink">{title ?? `Level ${levelNumber}`}</p>
          <span className="text-xs text-ink-faint">{days.length} days</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onAddDay}>
            <Plus className="h-4 w-4" />
            Add workout day
          </Button>
          <Button variant="secondary" onClick={onAddRestDay}>
            <Coffee className="h-4 w-4" />
            Add rest day
          </Button>
          <Button
            variant="ghost"
            busy={deleteLevel.isPending}
            onClick={() => {
              setError(null);
              // The API refuses to delete a level that still holds days — that
              // guard prevents orphaning content, so surface its message.
              deleteLevel
                .mutateAsync(levelId)
                .catch((err) => setError(errorMessage(err, 'Could not delete the level')));
            }}
            aria-label={`Delete level ${levelNumber}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4">
        {days.length === 0 ? (
          <p className="text-sm text-ink-faint">No days yet — add the first one.</p>
        ) : (
          <DayList programId={programId} days={days} />
        )}
      </div>
    </div>
  );
}

function DayList({ programId, days }: { programId: string; days: AdminDay[] }) {
  const deleteDay = useDeleteDay(programId);

  return (
    <ul className="divide-y divide-edge">
      {days.map((day) => (
        <li key={day.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-dim">Day {day.dayNumber}</span>
              <span className="text-sm text-ink">{day.title ?? '—'}</span>
              {day.isRestDay && (
                <Badge tone="amber">
                  <Coffee className="mr-1 h-3 w-3" />
                  Rest
                </Badge>
              )}
              {/* The session engine skips non-approved exercises, so without
                  this the day silently plays shorter than it reads here. */}
              {day.unavailableCount > 0 && (
                <Badge tone="danger">
                  {day.unavailableCount} won&rsquo;t play
                </Badge>
              )}
            </div>
            {!day.isRestDay && day.exercises.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-ink-faint">
                {day.exercises
                  .map((e) => (e.playable ? (e.title ?? e.exerciseId) : `${e.title ?? 'Removed'} (not approved)`))
                  .join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-faint">
              {day.isRestDay
                ? 'rest'
                : day.unavailableCount > 0
                  ? `${day.exercises.length - day.unavailableCount} of ${day.exercises.length} play`
                  : `${day.exercises.length} exercises`}
            </span>
            <Button
              variant="ghost"
              onClick={() => deleteDay.mutate(day.id)}
              aria-label={`Delete day ${day.dayNumber}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AddLevelModal({
  programId,
  nextNumber,
  onClose,
}: {
  programId: string;
  nextNumber: number;
  onClose: () => void;
}) {
  const create = useCreateLevel(programId);
  const [levelNumber, setLevelNumber] = useState(String(nextNumber));
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal title="Add level" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await create.mutateAsync({
              levelNumber: Number(levelNumber),
              title: title || undefined,
            });
            onClose();
          } catch (err) {
            setError(errorMessage(err, 'Could not add the level'));
          }
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Number"
            type="number"
            min={1}
            value={levelNumber}
            onChange={(e) => setLevelNumber(e.target.value)}
            required
          />
          <div className="col-span-2">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Foundation"
              autoFocus
            />
          </div>
        </div>
        <p className="text-xs text-ink-faint">
          Day numbers restart at 1 inside each level. Patients unlock the next level once they
          finish every day in this one.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={create.isPending}>
            Add level
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddDayModal({
  programId,
  levelNumber,
  levelTitle,
  nextDayNumber,
  defaultRestDay = false,
  onClose,
}: {
  programId: string;
  levelNumber?: number;
  levelTitle?: string;
  nextDayNumber: number;
  /** Pre-ticks "rest day" when opened from the Add rest day button. */
  defaultRestDay?: boolean;
  onClose: () => void;
}) {
  const create = useCreateDay(programId);
  const [dayNumber, setDayNumber] = useState(String(nextDayNumber));
  const [title, setTitle] = useState(defaultRestDay ? 'Rest' : '');
  const [isRestDay, setIsRestDay] = useState(defaultRestDay);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Slots are keyed independently of the exercise, because the SAME exercise
  // may legitimately appear twice in a day (a stretch to open and to close).
  const slotSeq = useRef(0);

  const options = useExerciseOptions(search);

  function add(ex: ExerciseOption) {
    slotSeq.current += 1;
    setPicked((prev) => [...prev, { ...ex, slotId: `slot-${slotSeq.current}` }]);
  }

  function removeSlot(slotId: string) {
    setPicked((prev) => prev.filter((p) => p.slotId !== slotId));
  }

  const totalSeconds = picked.reduce((s, e) => s + e.durationSeconds, 0);

  return (
    <Modal
      title={
        (isRestDay ? 'Add rest day' : 'Add workout day') +
        (levelNumber ? ` — Level ${levelNumber}${levelTitle ? ` (${levelTitle})` : ''}` : '')
      }
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await create.mutateAsync({
              levelNumber,
              dayNumber: Number(dayNumber),
              title: title || undefined,
              isRestDay,
              // Selection order becomes playback order.
              exercises: picked.map((ex, order) => ({ exercise: ex.id, order })),
            });
            onClose();
          } catch (err) {
            setError(errorMessage(err, 'Could not add the day'));
          }
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Day"
            type="number"
            min={1}
            value={dayNumber}
            onChange={(e) => setDayNumber(e.target.value)}
            required
          />
          <div className="col-span-2">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Gentle Mobility"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isRestDay}
            onChange={(e) => setIsRestDay(e.target.checked)}
            className="h-4 w-4 accent-mint"
          />
          Rest day (no exercises)
        </label>

        {isRestDay && (
          <p className="rounded-lg border border-amber/40 bg-amber/8 px-3 py-2.5 text-xs text-amber">
            Patients see a rest card with an &quot;I rested today&quot; button instead of a
            workout, and advance to the next day when they tap it.
          </p>
        )}

        {!isRestDay && (
          <ExercisePicker
            search={search}
            onSearch={setSearch}
            options={options.data ?? []}
            loading={options.isLoading}
            picked={picked}
            onAdd={add}
            onRemove={removeSlot}
            onReorder={setPicked}
            totalSeconds={totalSeconds}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={create.isPending} disabled={!isRestDay && picked.length === 0}>
            Add day
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Two-pane exercise picker: the library on the left (thumbnail, difficulty,
 * length, tags), the chosen running order on the right.
 *
 * Order matters — it's the sequence the patient plays — so the selected list is
 * numbered and reorderable rather than being a bare set of checkboxes.
 */
function ExercisePicker({
  search,
  onSearch,
  options,
  loading,
  picked,
  onAdd,
  onRemove,
  onReorder,
  totalSeconds,
}: {
  search: string;
  onSearch: (v: string) => void;
  options: ExerciseOption[];
  loading: boolean;
  picked: PickedExercise[];
  onAdd: (ex: ExerciseOption) => void;
  onRemove: (slotId: string) => void;
  onReorder: (next: PickedExercise[]) => void;
  totalSeconds: number;
}) {
  function move(index: number, delta: number) {
    const next = [...picked];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onReorder(next);
  }

  return (
    <div>
      <Input
        label="Exercises"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search the approved library…"
      />

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Library */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-edge">
          {loading ? (
            <p className="px-3 py-6 text-sm text-ink-faint">Loading…</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-6 text-sm text-ink-faint">
              No approved exercises match. Upload and approve videos first.
            </p>
          ) : (
            options.map((ex) => {
              const timesUsed = picked.filter((p) => p.id === ex.id).length;
              const active = timesUsed > 0;
              return (
                <button
                  key={ex.id}
                  type="button"
                  aria-label={`Add ${ex.title} to this day`}
                  onClick={() => onAdd(ex)}
                  className={`flex w-full items-center gap-3 border-b border-edge px-2.5 py-2 text-left last:border-0 transition ${
                    active ? 'bg-mint/10' : 'hover:bg-surface-hi'
                  }`}
                >
                  <Thumb url={ex.thumbnailPlaybackUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm text-ink">{ex.title}</span>
                      {ex.isWarmup && <Flame className="h-3 w-3 shrink-0 text-amber" />}
                      {ex.isCooldown && <Snowflake className="h-3 w-3 shrink-0 text-peri" />}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                      {ex.difficulty} · {ex.durationSeconds}s
                      {ex.areaTag.length > 0 && ` · ${ex.areaTag.join(', ').replace(/_/g, ' ')}`}
                    </span>
                  </span>
                  {active && <Badge tone="mint">{timesUsed > 1 ? `×${timesUsed}` : '✓'}</Badge>}
                </button>
              );
            })
          )}
        </div>

        {/* Running order */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-edge">
          <div className="sticky top-0 flex items-center justify-between border-b border-edge bg-surface px-3 py-2">
            <span className="label-micro">Day order</span>
            <span className="text-[11px] text-ink-faint">
              {picked.length} · ~{Math.max(1, Math.round(totalSeconds / 60))} min
            </span>
          </div>
          {picked.length === 0 ? (
            <p className="px-3 py-6 text-sm text-ink-faint">
              Pick exercises on the left. They play in this order — warmup first, cooldown last.
              Tap one more than once to repeat it in the same day.
            </p>
          ) : (
            picked.map((ex, i) => (
              <div
                key={ex.slotId}
                className="flex items-center gap-2 border-b border-edge px-2.5 py-2 last:border-0"
              >
                <span className="w-5 shrink-0 text-center text-xs text-ink-faint">{i + 1}</span>
                <Thumb url={ex.thumbnailPlaybackUrl} small />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{ex.title}</span>
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="px-1 text-[10px] leading-3 text-ink-dim hover:text-ink disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === picked.length - 1}
                    aria-label="Move down"
                    className="px-1 text-[10px] leading-3 text-ink-dim hover:text-ink disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(ex.slotId)}
                  aria-label={`Remove ${ex.title}`}
                  className="px-1 text-ink-dim hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Thumbnail with a graceful fallback — most seeded exercises have no image. */
function Thumb({ url, small = false }: { url: string | null; small?: boolean }) {
  const size = small ? 'h-7 w-10' : 'h-10 w-14';
  if (!url) {
    return (
      <span
        className={`${size} flex shrink-0 items-center justify-center rounded bg-surface-hi`}
      >
        <Film className="h-3.5 w-3.5 text-ink-faint" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className={`${size} shrink-0 rounded object-cover`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
