import { Construction } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';

/**
 * Honest stand-in for routes whose UI hasn't been built yet.
 *
 * Deliberately shows NO fake data: this is a clinical tool, and a plausible-
 * looking empty table is worse than an explicit "not built yet". `backend`
 * states whether the API is already available, so it's obvious what's blocking.
 */
interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  backend: string;
}

export function PlaceholderPage({ title, subtitle, backend }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="mt-8 flex flex-col items-center justify-center rounded-card border border-dashed border-edge bg-surface/50 px-6 py-16 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-hi">
          <Construction className="h-5 w-5 text-ink-dim" />
        </div>
        <p className="mt-4 font-medium text-ink">Not built yet</p>
        <p className="mt-1.5 max-w-sm text-sm text-ink-dim">
          This screen is next up. Nothing here is mocked — it will show real data the
          moment it&apos;s wired.
        </p>
        <p className="mt-4 rounded-md bg-surface-hi px-3 py-1.5 text-[11px] text-ink-faint">
          {backend}
        </p>
      </div>
    </div>
  );
}
