import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Layers, Pencil, Plus, Search } from 'lucide-react';

import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/PageHeader';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Spinner,
} from '@/components/ui';
import {
  useProgramList,
  useSetPublished,
  type ProgramRow,
  type ProgramType,
} from '@/features/programs/api';
import { PROGRAM_TYPE_LABELS } from '@/constants/vocab';
import { ProgramFormModal } from '@/routes/ProgramForm';

export function ProgramsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ProgramType | ''>('');
  const [published, setPublished] = useState<'' | 'true' | 'false'>('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProgramRow | null>(null);

  const list = useProgramList({
    search: search || undefined,
    type: type || undefined,
    isPublished: published === '' ? undefined : published === 'true',
    limit: 50,
  });
  const setPublishedMutation = useSetPublished();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Programs"
        subtitle="Build the plans patients follow — levels, days and exercises."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New program
          </Button>
        }
      />

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-ink-faint" />
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Program name…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as ProgramType | '')}>
            <option value="">All types</option>
            {Object.entries(PROGRAM_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Status"
            value={published}
            onChange={(e) => setPublished(e.target.value as '' | 'true' | 'false')}
          >
            <option value="">All</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6">
        {list.isLoading ? (
          <Spinner />
        ) : list.error ? (
          <ErrorState message={errorMessage(list.error, 'Could not load programs')} onRetry={list.refetch} />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyState
            title="No programs match"
            note="Try clearing the filters, or create your first program."
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-card border border-edge">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge bg-surface">
                    <th className="label-micro px-4 py-3 text-left">Program</th>
                    <th className="label-micro hidden px-4 py-3 text-left md:table-cell">Type</th>
                    <th className="label-micro hidden px-4 py-3 text-left lg:table-cell">Content</th>
                    <th className="label-micro px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.data?.data.map((p) => (
                    <tr key={p.id} className="border-b border-edge last:border-0 hover:bg-surface/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.thumbnailImageUrl ? (
                            <img
                              src={p.thumbnailImageUrl}
                              alt=""
                              className="hidden h-9 w-14 shrink-0 rounded object-cover sm:block"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="hidden h-9 w-14 shrink-0 items-center justify-center rounded bg-surface-hi sm:flex">
                              <ImageIcon className="h-3.5 w-3.5 text-ink-faint" />
                            </span>
                          )}
                          <div className="min-w-0">
                        <Link to={`/programs/${p.id}`} className="font-medium text-ink hover:text-mint">
                          {p.name ?? 'Untitled'}
                        </Link>
                        {p.targetAreas.length > 0 && (
                          <p className="mt-0.5 hidden text-xs text-ink-faint lg:block">
                            {p.targetAreas.slice(0, 3).join(' · ').replace(/_/g, ' ')}
                          </p>
                        )}
                        {/* Columns hidden at this width, kept legible inline. */}
                        <p className="mt-0.5 text-xs text-ink-faint lg:hidden">
                          {PROGRAM_TYPE_LABELS[p.type]} · {p.levelCount > 0 ? `${p.levelCount} levels · ` : ''}
                          {p.dayCount} days
                        </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <Badge tone={p.type === 'SHORT' ? 'peri' : 'neutral'}>
                          {PROGRAM_TYPE_LABELS[p.type]}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-ink-dim lg:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5" />
                          {p.levelCount > 0 ? `${p.levelCount} levels · ` : ''}
                          {p.dayCount} days
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.isPublished ? (
                          <Badge tone="mint">Published</Badge>
                        ) : (
                          <Badge tone="amber">Draft</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditing(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          busy={
                            setPublishedMutation.isPending &&
                            setPublishedMutation.variables?.id === p.id
                          }
                          onClick={() =>
                            setPublishedMutation.mutate({ id: p.id, isPublished: !p.isPublished })
                          }
                        >
                          {p.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Showing {list.data?.data.length} of {list.data?.pagination.total} programs
            </p>
          </>
        )}
      </div>

      {creating && <ProgramFormModal onClose={() => setCreating(false)} />}
      {editing && <ProgramFormModal program={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
