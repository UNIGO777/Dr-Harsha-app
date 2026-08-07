import { ClipboardList, Dumbbell, ShieldAlert, Users } from 'lucide-react';

import { useAuthStore } from '@/features/auth/useAuthStore';
import { PageHeader } from '@/components/PageHeader';

/**
 * Landing view for the portal.
 *
 * The tiles are intentionally UNPOPULATED — there are no aggregate/stats
 * endpoints on the backend yet, and inventing numbers in a clinical tool would
 * be worse than showing none. Each tile names what will fill it.
 */
export function OverviewPage() {
  const staff = useAuthStore((s) => s.staff);
  const firstName = staff?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Signed in to the Sanchara clinical portal."
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PendingTile
          icon={Users}
          title="Patients"
          note="Patient list, session history and pain trends."
          pending="Needs a staff patients API — not built yet"
        />
        <PendingTile
          icon={ClipboardList}
          title="Programs"
          note="Build programs, levels and daily workouts."
          pending="Programs API exists — UI next"
        />
        <PendingTile
          icon={Dumbbell}
          title="Exercises"
          note="Upload videos, edit metadata, manage the library."
          pending="Exercises API exists — UI next"
        />
        {staff?.role === 'ADMIN' && (
          <PendingTile
            icon={ShieldAlert}
            title="Approvals"
            note="Review and approve clinician-uploaded videos."
            pending="GET /exercises/admin/pending — UI next"
          />
        )}
      </div>

      <div className="mt-8 rounded-card border border-edge bg-surface p-5">
        <p className="label-micro">Session</p>
        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-ink-faint">Email</dt>
            <dd className="mt-0.5 text-ink">{staff?.email}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Role</dt>
            <dd className="mt-0.5 text-ink">{staff?.role}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Two-factor</dt>
            <dd className="mt-0.5">
              {staff?.totpEnabled ? (
                <span className="text-mint">Enabled</span>
              ) : (
                <span className="text-amber">Not enrolled</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

interface PendingTileProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
  /** What still has to be built before this tile shows real data. */
  pending: string;
}

function PendingTile({ icon: Icon, title, note, pending }: PendingTileProps) {
  return (
    <div className="rounded-card border border-edge bg-surface p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hi">
        <Icon className="h-4.5 w-4.5 text-ink-dim" />
      </div>
      <p className="mt-3 font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-dim">{note}</p>
      <p className="mt-3 text-[11px] text-ink-faint">{pending}</p>
    </div>
  );
}
