import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldAlert,
  Users,
} from 'lucide-react';

import { useAuthStore } from '@/features/auth/useAuthStore';
import type { StaffRole } from '@/features/auth/api';

/**
 * Portal chrome: fixed sidebar + scrolling content area.
 *
 * Nav items declare the roles that may see them. CLINICAL_STAFF get patient and
 * content work; ADMIN additionally gets approvals, audit and staff management.
 * This is a UI convenience only — the backend independently enforces the same
 * rules via `requireRole`, so hiding a link is never the security boundary.
 */
interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: StaffRole[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, roles: ['CLINICAL_STAFF', 'ADMIN'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['CLINICAL_STAFF', 'ADMIN'] },
  { to: '/programs', label: 'Programs', icon: ClipboardList, roles: ['CLINICAL_STAFF', 'ADMIN'] },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell, roles: ['CLINICAL_STAFF', 'ADMIN'] },
  { to: '/approvals', label: 'Approvals', icon: ShieldAlert, roles: ['ADMIN'] },
  { to: '/audit', label: 'Audit log', icon: ScrollText, roles: ['ADMIN'] },
];

export function AppShell() {
  const staff = useAuthStore((s) => s.staff);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const visible = NAV.filter((item) => !staff || item.roles.includes(staff.role));

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-[236px] shrink-0 flex-col border-r border-edge bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/12">
            <Activity className="h-4.5 w-4.5 text-mint" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-[0.2em] text-mint">SANCHARA</p>
            <p className="text-[11px] text-ink-faint">Clinical portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-mint/12 font-medium text-mint'
                    : 'text-ink-dim hover:bg-surface-hi hover:text-ink'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-edge p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hi text-xs font-semibold text-ink">
              {(staff?.name ?? staff?.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{staff?.name ?? staff?.email}</p>
              <p className="text-[11px] text-ink-faint">
                {staff?.role === 'ADMIN' ? 'Administrator' : 'Clinical staff'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-dim transition hover:bg-surface-hi hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
