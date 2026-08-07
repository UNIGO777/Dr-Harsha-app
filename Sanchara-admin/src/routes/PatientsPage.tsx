import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

import { errorMessage } from '@/api/client';
import { PageHeader } from '@/components/PageHeader';
import { Badge, EmptyState, ErrorState, Input, Select, Spinner } from '@/components/ui';
import { useAuthStore } from '@/features/auth/useAuthStore';
import {
  usePatientList,
  type AccountStatus,
  type UserGroup,
} from '@/features/patients/api';

const STATUS_TONE: Record<AccountStatus, 'mint' | 'amber' | 'neutral'> = {
  active: 'mint',
  waitlisted: 'amber',
  locked: 'neutral',
};

const GROUP_LABEL: Record<UserGroup, string> = {
  GROUP_1: 'Group 1 · 30–45',
  GROUP_2: 'Group 2 · 46–60',
  WAITLIST: 'Waitlist',
};

export function PatientsPage() {
  const staff = useAuthStore((s) => s.staff);
  const isAdmin = staff?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState<AccountStatus | ''>('');
  const [group, setGroup] = useState<UserGroup | ''>('');

  const list = usePatientList({
    search: search || undefined,
    accountStatus: accountStatus || undefined,
    group: group || undefined,
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Patients"
        subtitle={
          isAdmin
            ? 'Everyone using the app.'
            : 'The patients assigned to you.'
        }
      />

      {/* Status chips */}
      {list.data && (
        <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip
            label="All"
            count={Object.values(list.data.statusCounts).reduce((a, b) => a + b, 0)}
            active={accountStatus === ''}
            onClick={() => setAccountStatus('')}
          />
          {(['active', 'waitlisted', 'locked'] as AccountStatus[]).map((s) => (
            <Chip
              key={s}
              label={s[0]!.toUpperCase() + s.slice(1)}
              count={list.data.statusCounts[s]}
              active={accountStatus === s}
              onClick={() => setAccountStatus(s)}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-8.5 h-4 w-4 text-ink-faint" />
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone or email…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Age group"
            value={group}
            onChange={(e) => setGroup(e.target.value as UserGroup | '')}
          >
            <option value="">All groups</option>
            {Object.entries(GROUP_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6">
        {list.isLoading ? (
          <Spinner />
        ) : list.error ? (
          <ErrorState
            message={errorMessage(list.error, 'Could not load patients')}
            onRetry={list.refetch}
          />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyState
            title="No patients found"
            note={
              isAdmin
                ? 'Nobody matches these filters yet.'
                : 'No patients are assigned to you. An administrator assigns them.'
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-card border border-edge">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge bg-surface">
                    <th className="label-micro px-4 py-3 text-left">Patient</th>
                    <th className="label-micro hidden px-4 py-3 text-left md:table-cell">Group</th>
                    <th className="label-micro hidden px-4 py-3 text-left lg:table-cell">Pain areas</th>
                    <th className="label-micro px-4 py-3 text-left">Status</th>
                    <th className="label-micro hidden px-4 py-3 text-left lg:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.data.map((p) => (
                    <tr key={p.id} className="border-b border-edge last:border-0 hover:bg-surface/60">
                      <td className="px-4 py-3">
                        <Link
                          to={`/patients/${p.id}`}
                          className="font-medium text-ink hover:text-mint"
                        >
                          {p.name ?? 'Unnamed'}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {p.phone}
                          {p.age ? ` · ${p.age}y` : ''}
                          {p.gender ? ` · ${p.gender}` : ''}
                        </p>
                        {/* Columns hidden at this width, kept legible inline. */}
                        <p className="mt-0.5 text-xs text-ink-faint md:hidden">
                          {p.group ? GROUP_LABEL[p.group] : 'No group'}
                          {p.painAreas.length > 0 && ` · ${p.painAreas.slice(0, 2).join(', ')}`}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 text-ink-dim md:table-cell">
                        {p.group ? GROUP_LABEL[p.group] : '—'}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {p.painAreas.length === 0 ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <span className="text-ink-dim">
                            {p.painAreas.slice(0, 2).join(', ')}
                            {p.painAreas.length > 2 && (
                              <span className="text-ink-faint"> +{p.painAreas.length - 2}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[p.accountStatus]}>{p.accountStatus}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-ink-faint lg:table-cell">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Showing {list.data?.data.length} of {list.data?.pagination.total} patients
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Chip({
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
