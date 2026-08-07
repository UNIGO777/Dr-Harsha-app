import { useState } from 'react';
import { ImagePlus } from 'lucide-react';

import { errorMessage } from '@/api/client';
import { Button, Input, Modal, MultiSelect, Select } from '@/components/ui';
import {
  AGE_GROUPS,
  CONDITIONS,
  GOALS,
  PATIENT_PAIN_AREAS,
  PROGRAM_TYPE_LABELS,
} from '@/constants/vocab';
import {
  useCreateProgram,
  useUpdateProgram,
  useUploadProgramThumbnail,
  type Difficulty,
  type ProgramRow,
  type ProgramType,
} from '@/features/programs/api';

/**
 * One form for creating and editing a program.
 *
 * The four tag pickers drive the recommendation engine — their values are
 * matched against what the patient app stored at onboarding, so they come from
 * a fixed vocabulary rather than free text (see constants/vocab.ts).
 */
export function ProgramFormModal({
  program,
  onClose,
}: {
  program?: ProgramRow;
  onClose: () => void;
}) {
  const isEdit = !!program;
  const create = useCreateProgram();
  const update = useUpdateProgram(program?.id ?? '');
  const uploadThumb = useUploadProgramThumbnail();

  const [name, setName] = useState(program?.name ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [type, setType] = useState<ProgramType>(program?.type ?? 'STANDARD');
  const [durationDays, setDurationDays] = useState(
    program?.durationDays ? String(program.durationDays) : '',
  );
  const [difficultyLevel, setDifficultyLevel] = useState<Difficulty | ''>(
    program?.difficultyLevel ?? '',
  );
  const [goalTag, setGoalTag] = useState<string[]>(program?.goalTag ?? []);
  const [targetAreas, setTargetAreas] = useState<string[]>(program?.targetAreas ?? []);
  const [suitableConditions, setSuitableConditions] = useState<string[]>(
    program?.suitableConditions ?? [],
  );
  const [ageGroups, setAgeGroups] = useState<string[]>(program?.ageGroups ?? []);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview the newly-picked file, else whatever the program already has.
  const previewUrl = thumbnail
    ? URL.createObjectURL(thumbnail)
    : (program?.thumbnailImageUrl ?? null);

  const busy = create.isPending || update.isPending || uploadThumb.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fields = {
      name,
      description: description || undefined,
      durationDays: durationDays ? Number(durationDays) : undefined,
      difficultyLevel: difficultyLevel || undefined,
      goalTag,
      targetAreas,
      suitableConditions,
      ageGroups,
    };
    try {
      // Upload first when a new cover was picked — it returns a storage key.
      const thumbnailUrl = thumbnail ? await uploadThumb.mutateAsync(thumbnail) : undefined;
      if (thumbnailUrl) Object.assign(fields, { thumbnailUrl });

      if (isEdit) {
        // `type` is intentionally not editable: switching a levelled program to
        // SHORT (or back) would strand its existing levels and days.
        await update.mutateAsync(fields);
      } else {
        await create.mutateAsync({ ...fields, type });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, `Could not ${isEdit ? 'save' : 'create'} the program`));
    }
  }

  return (
    <Modal title={isEdit ? `Edit "${program.name ?? 'program'}"` : 'New program'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lower Back Rehab"
          required
          autoFocus
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Who is this for, and what does it achieve?"
        />

        {/* Cover image — shown on the patient app's program cards. */}
        <div>
          <span className="label-micro mb-1.5 block">Cover image</span>
          <div className="flex items-center gap-3 rounded-lg border border-edge bg-surface p-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="h-14 w-20 shrink-0 rounded object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded bg-surface-hi">
                <ImagePlus className="h-4 w-4 text-ink-faint" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-dim hover:text-ink">
                <ImagePlus className="h-4 w-4" />
                <span className="truncate">
                  {thumbnail
                    ? thumbnail.name
                    : previewUrl
                      ? 'Replace cover image…'
                      : 'Choose cover image…'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="mt-0.5 text-xs text-ink-faint">JPG or PNG, up to 5MB.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {isEdit ? (
            <div>
              <span className="label-micro mb-1.5 block">Type</span>
              <p className="flex h-10 items-center text-sm text-ink-dim">{PROGRAM_TYPE_LABELS[type]}</p>
            </div>
          ) : (
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as ProgramType)}
            >
              {Object.entries(PROGRAM_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
          <Input
            label="Duration (days)"
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            placeholder="30"
          />
          <Select
            label="Difficulty"
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(e.target.value as Difficulty | '')}
          >
            <option value="">Not set</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
        </div>

        {/* These four decide which patients get this program recommended, so the
            values must match the patient app exactly. */}
        <MultiSelect
          label="Goals"
          hint="Matched against the patient's onboarding goal."
          options={GOALS}
          selected={goalTag}
          onChange={setGoalTag}
        />
        <MultiSelect
          label="Target areas"
          hint="Matched against the patient's selected pain areas."
          options={PATIENT_PAIN_AREAS}
          selected={targetAreas}
          onChange={setTargetAreas}
        />
        <MultiSelect
          label="Suitable for conditions"
          hint="Optional — matched against the patient's declared conditions."
          options={CONDITIONS}
          selected={suitableConditions}
          onChange={setSuitableConditions}
        />
        <MultiSelect
          label="Age groups"
          hint="Leave empty to allow every eligible age group."
          options={AGE_GROUPS}
          selected={ageGroups}
          onChange={setAgeGroups}
        />

        {!isEdit && (
          <p className="text-xs text-ink-faint">
            Created as a draft — add levels and days, then publish when it&apos;s ready for
            patients.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            {uploadThumb.isPending
              ? 'Uploading…'
              : isEdit
                ? 'Save changes'
                : 'Create program'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
