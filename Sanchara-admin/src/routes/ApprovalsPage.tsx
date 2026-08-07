import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, Spinner } from '@/components/ui';
import {
  useApproveExercise,
  usePendingExercises,
  useRejectExercise,
  type Exercise,
} from '@/features/exercises/api';

/**
 * Admin approval queue: clinician-uploaded videos waiting to reach patients.
 *
 * Both actions are audit-logged server-side (VIDEO_APPROVED / VIDEO_REJECTED),
 * and a rejection reason is mandatory so the uploader knows what to fix.
 */
export function ApprovalsPage() {
  const pending = usePendingExercises();
  const approve = useApproveExercise();
  const [rejecting, setRejecting] = useState<Exercise | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Approvals"
        subtitle="Review clinician uploads before patients can see them."
      />

      <div className="mt-8">
        {pending.isLoading ? (
          <Spinner />
        ) : pending.error ? (
          <ErrorState
            message={errorMessage(pending.error, 'Could not load the queue')}
            onRetry={pending.refetch}
          />
        ) : !pending.data || pending.data.length === 0 ? (
          <EmptyState title="Nothing waiting" note="Every uploaded video has been reviewed." />
        ) : (
          <div className="space-y-4">
            {pending.data.map((ex) => (
              <div key={ex.id} className="rounded-card border border-edge bg-surface p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{ex.title}</p>
                      <Badge tone="amber">Pending</Badge>
                    </div>
                    {ex.description && (
                      <p className="mt-1 text-sm text-ink-dim">{ex.description}</p>
                    )}
                    <p className="mt-2 text-xs text-ink-faint">
                      {ex.difficulty} · {ex.durationSeconds}s
                      {ex.areaTag.length > 0 && ` · ${ex.areaTag.join(', ').replace(/_/g, ' ')}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      busy={approve.isPending && approve.variables === ex.id}
                      onClick={() => approve.mutate(ex.id)}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => setRejecting(ex)}>
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>

                {ex.playbackUrl && (
                  <video
                    src={ex.playbackUrl}
                    controls
                    className="mt-4 w-full rounded-lg bg-black"
                    style={{ maxHeight: 280 }}
                  >
                    <track kind="captions" />
                  </video>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {rejecting && <RejectModal exercise={rejecting} onClose={() => setRejecting(null)} />}
    </div>
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
        <p className="text-xs text-ink-faint">Required, and recorded in the audit log.</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
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
