import { useState } from 'react';
import { Check, Pencil, Plus, Search, Stethoscope, Upload, X } from 'lucide-react';

import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/PageHeader';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  MultiSelect,
  Select,
  Spinner,
} from '@/components/ui';
import { EXERCISE_AREAS, GOALS } from '@/constants/vocab';
import { useAuthStore } from '@/features/auth/useAuthStore';
import {
  useApproveExercise,
  useCreateExercise,
  useExerciseList,
  useRejectExercise,
  useUpdateExercise,
  useUploadVideo,
  type Exercise,
  type ExerciseStatus,
  type GenderFilter,
} from '@/features/exercises/api';
import type { Difficulty } from '@/features/programs/api';

const STATUS_TONE: Record<ExerciseStatus, 'mint' | 'amber' | 'neutral'> = {
  APPROVED: 'mint',
  PENDING_APPROVAL: 'amber',
  REJECTED: 'neutral',
};
const STATUS_LABEL: Record<ExerciseStatus, string> = {
  APPROVED: 'Approved',
  PENDING_APPROVAL: 'Pending',
  REJECTED: 'Rejected',
};

export function ExercisesPage() {
  const isAdmin = useAuthStore((s) => s.staff?.role === 'ADMIN');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ExerciseStatus | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [rejecting, setRejecting] = useState<Exercise | null>(null);

  const list = useExerciseList({
    search: search || undefined,
    status: status || undefined,
    difficulty: difficulty || undefined,
  });
  const approve = useApproveExercise();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Exercises"
        subtitle="The video library that programs are built from."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New exercise
          </Button>
        }
      />

      {/* Status summary */}
      {list.data && (
        <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
          <StatusChip
            label="All"
            count={Object.values(list.data.statusCounts).reduce((a, b) => a + b, 0)}
            active={status === ''}
            onClick={() => setStatus('')}
          />
          {(Object.keys(STATUS_LABEL) as ExerciseStatus[]).map((s) => (
            <StatusChip
              key={s}
              label={STATUS_LABEL[s]}
              count={list.data.statusCounts[s]}
              active={status === s}
              onClick={() => setStatus(s)}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-ink-faint" />
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Exercise title…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
          >
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        {list.isLoading ? (
          <Spinner />
        ) : list.error ? (
          <ErrorState
            message={errorMessage(list.error, 'Could not load the library')}
            onRetry={list.refetch}
          />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyState title="No exercises match" note="Try clearing the filters, or upload one." />
        ) : (
          <div className="overflow-hidden rounded-card border border-edge">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge bg-surface">
                  <th className="label-micro px-4 py-3 text-left">Exercise</th>
                  <th className="label-micro hidden px-4 py-3 text-left md:table-cell">Difficulty</th>
                  <th className="label-micro hidden px-4 py-3 text-left lg:table-cell">Length</th>
                  <th className="label-micro px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.data?.data.map((ex) => (
                  <tr key={ex.id} className="border-b border-edge last:border-0 hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreview(ex)}
                          className="font-medium text-ink hover:text-mint"
                        >
                          {ex.title}
                        </button>
                        {ex.clinicalExclusive && (
                          <span title="Clinical use only — hidden from patient browse">
                            <Stethoscope className="h-3.5 w-3.5 text-peri" />
                          </span>
                        )}
                        {ex.isWarmup && <Badge>Warmup</Badge>}
                        {ex.isCooldown && <Badge>Cooldown</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        <span className="md:hidden">{ex.difficulty} · {ex.durationSeconds}s</span>
                        {ex.areaTag.length > 0 && (
                          <span className="md:hidden"> · </span>
                        )}
                        {ex.areaTag.length > 0 && ex.areaTag.join(' · ').replace(/_/g, ' ')}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-dim md:table-cell">{ex.difficulty}</td>
                    <td className="hidden px-4 py-3 text-ink-dim lg:table-cell">{ex.durationSeconds}s</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[ex.status]}>{STATUS_LABEL[ex.status]}</Badge>
                      {ex.status === 'REJECTED' && ex.rejectionReason && (
                        <p className="mt-1 max-w-[220px] truncate text-xs text-ink-faint">
                          {ex.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" onClick={() => setPreview(ex)}>
                          Preview
                        </Button>
                        <Button variant="ghost" onClick={() => setEditing(ex)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {isAdmin && ex.status !== 'APPROVED' && (
                          <Button
                            variant="secondary"
                            busy={approve.isPending && approve.variables === ex.id}
                            onClick={() => approve.mutate(ex.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        )}
                        {isAdmin && ex.status !== 'REJECTED' && (
                          <Button variant="ghost" onClick={() => setRejecting(ex)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && <ExerciseFormModal onClose={() => setCreating(false)} />}
      {editing && <ExerciseFormModal exercise={editing} onClose={() => setEditing(null)} />}
      {preview && <PreviewModal exercise={preview} onClose={() => setPreview(null)} />}
      {rejecting && <RejectModal exercise={rejecting} onClose={() => setRejecting(null)} />}
    </div>
  );
}

function StatusChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active ? 'bg-mint/12 font-medium text-mint' : 'text-ink-dim hover:bg-surface-hi hover:text-ink'
      }`}
    >
      {label} <span className="text-ink-faint">{count}</span>
    </button>
  );
}

function PreviewModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <Modal title={exercise.title} onClose={onClose}>
      {exercise.playbackUrl ? (
        <video
          src={exercise.playbackUrl}
          controls
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: 320 }}
        >
          <track kind="captions" />
        </video>
      ) : (
        <p className="rounded-lg border border-edge bg-surface-hi px-4 py-6 text-center text-sm text-ink-dim">
          No video available.
        </p>
      )}
      <p className="mt-2 text-xs text-ink-faint">
        Served locally from the uploads folder. Bunny.net signed URLs replace this at deploy —
        the player doesn&apos;t change.
      </p>

      {exercise.description && <p className="mt-4 text-sm text-ink-dim">{exercise.description}</p>}

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="label-micro">Difficulty</dt>
          <dd className="mt-0.5 text-ink">{exercise.difficulty}</dd>
        </div>
        <div>
          <dt className="label-micro">Length</dt>
          <dd className="mt-0.5 text-ink">{exercise.durationSeconds}s</dd>
        </div>
        <div>
          <dt className="label-micro">Audience</dt>
          <dd className="mt-0.5 text-ink">{exercise.genderFilter}</dd>
        </div>
      </dl>
    </Modal>
  );
}

function RejectModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const reject = useRejectExercise();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal title={`Reject "${exercise.title}"`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await reject.mutateAsync({ id: exercise.id, rejectionReason: reason });
            onClose();
          } catch (err) {
            setError(errorMessage(err, 'Could not reject'));
          }
        }}
      >
        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What needs to change before this can be approved?"
          required
          autoFocus
        />
        <p className="text-xs text-ink-faint">
          The reason is required and is written to the audit log, so the uploader knows what to fix.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" busy={reject.isPending}>
            Reject
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * One form for both creating and editing.
 *
 * Create requires a video upload; edit keeps the existing one unless a new file
 * is chosen. Replacing the video on an APPROVED exercise sends it back to the
 * approval queue server-side — unreviewed footage must never inherit an old
 * approval — so the form warns about that before you submit.
 */
function ExerciseFormModal({
  exercise,
  onClose,
}: {
  exercise?: Exercise;
  onClose: () => void;
}) {
  const isEdit = !!exercise;
  const upload = useUploadVideo();
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const isAdmin = useAuthStore((s) => s.staff?.role === 'ADMIN');

  const [title, setTitle] = useState(exercise?.title ?? '');
  const [description, setDescription] = useState(exercise?.description ?? '');
  const [durationSeconds, setDurationSeconds] = useState(
    String(exercise?.durationSeconds ?? 45),
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(exercise?.difficulty ?? 'EASY');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(
    exercise?.genderFilter ?? 'all',
  );
  const [areaTag, setAreaTag] = useState<string[]>(exercise?.areaTag ?? []);
  const [goalTag, setGoalTag] = useState<string[]>(exercise?.goalTag ?? []);
  const [isWarmup, setIsWarmup] = useState(exercise?.isWarmup ?? false);
  const [isCooldown, setIsCooldown] = useState(exercise?.isCooldown ?? false);
  const [clinicalExclusive, setClinicalExclusive] = useState(exercise?.clinicalExclusive ?? false);
  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = upload.isPending || create.isPending || update.isPending;
  const willNeedReapproval = isEdit && !!video && exercise.status === 'APPROVED';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isEdit && !video) {
      setError('Choose an MP4 file to upload');
      return;
    }
    try {
      // Upload first when there's a new file: it returns storage KEYS, which are
      // what gets saved. A playable URL is never persisted.
      const keys = video
        ? await upload.mutateAsync({ video, thumbnail: thumbnail ?? undefined })
        : null;

      const fields = {
        title,
        description: description || undefined,
        durationSeconds: Number(durationSeconds),
        difficulty,
        genderFilter,
        areaTag,
        goalTag,
        isWarmup,
        isCooldown,
        clinicalExclusive,
      };

      if (isEdit) {
        await update.mutateAsync({
          id: exercise.id,
          ...fields,
          ...(keys ? { videoUrl: keys.videoStorageKey, thumbnailUrl: keys.thumbnailStorageKey } : {}),
        });
      } else {
        await create.mutateAsync({
          ...fields,
          videoUrl: keys!.videoStorageKey,
          thumbnailUrl: keys!.thumbnailStorageKey,
        });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, `Could not ${isEdit ? 'save' : 'create'} the exercise`));
    }
  }

  return (
    <Modal title={isEdit ? `Edit "${exercise.title}"` : 'New exercise'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Cat-Cow Stretch"
          required
          autoFocus
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="How it's performed and what it targets"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Length (sec)"
            type="number"
            min={1}
            max={90}
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            required
          />
          <Select
            label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
          <Select
            label="Audience"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
          >
            <option value="all">Everyone</option>
            <option value="female">Women only</option>
            <option value="male">Men only</option>
          </Select>
        </div>

        {/* Body areas drive the Too Hard / Too Easy alternative lookup, which
            matches on areaTag — so these must come from the shared vocabulary. */}
        <MultiSelect
          label="Body areas"
          hint="Used to find easier/harder alternatives during a session."
          options={EXERCISE_AREAS}
          selected={areaTag}
          onChange={setAreaTag}
        />
        <MultiSelect
          label="Goals"
          options={GOALS}
          selected={goalTag}
          onChange={setGoalTag}
        />

        <div className="flex flex-wrap gap-4 text-sm text-ink">
          <Toggle checked={isWarmup} onChange={setIsWarmup} label="Warmup" />
          <Toggle checked={isCooldown} onChange={setIsCooldown} label="Cooldown" />
          <Toggle
            checked={clinicalExclusive}
            onChange={setClinicalExclusive}
            label="Clinical only"
          />
        </div>

        {/* Media */}
        <div className="rounded-lg border border-edge bg-surface-hi/40 p-4">
          <p className="label-micro mb-2">{isEdit ? 'Replace media (optional)' : 'Media'}</p>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-dim hover:text-ink">
            <Upload className="h-4 w-4" />
            <span>
              {video
                ? video.name
                : isEdit
                  ? 'Keep current video — or choose a new MP4…'
                  : 'Choose MP4 video…'}
            </span>
            <input
              type="file"
              accept="video/mp4"
              className="hidden"
              onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink-dim hover:text-ink">
            <Upload className="h-4 w-4" />
            <span>
              {thumbnail
                ? thumbnail.name
                : isEdit
                  ? 'Keep current thumbnail — or choose a new one…'
                  : 'Choose thumbnail (optional)…'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-2 text-xs text-ink-faint">MP4 only. Large files may take a while.</p>
        </div>

        {willNeedReapproval && (
          <p className="rounded-lg border border-amber/40 bg-amber/8 px-3 py-2.5 text-xs text-amber">
            Replacing the video sends this exercise back to the approval queue — patients keep
            seeing the current version until it&apos;s approved again.
          </p>
        )}

        {!isEdit && (
          <p className="text-xs text-ink-faint">
            {isAdmin
              ? 'As an admin this is published as approved immediately.'
              : 'Submitted for admin approval before patients can see it.'}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            {upload.isPending ? 'Uploading…' : isEdit ? 'Save changes' : 'Create exercise'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-mint"
      />
      {label}
    </label>
  );
}
