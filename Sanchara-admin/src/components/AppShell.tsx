import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';

import { useAuthStore } from '@/features/auth/useAuthStore';
import type { StaffRole } from '@/features/auth/api';

/**
 * Portal chrome.
 *
 * Desktop (lg+): a permanent sidebar beside the scrolling content.
 * Below lg: the sidebar becomes an off-canvas drawer behind a hamburger, since
 * a 236px rail would eat most of a phone screen.
 *
 * Nav items declare which roles may see them. CLINICAL_STAFF get patient and
 * content work; ADMIN additionally gets approvals and audit. This is a UI
 * convenience only — the backend independently enforces the same rules via
 * `requireRole`, so hiding a link is never the security boundary.
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
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Navigating should always dismiss the drawer, or it covers the new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const visible = NAV.filter((item) => !staff || item.roles.includes(staff.role));

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/12">
          <Activity className="h-4.5 w-4.5 text-mint" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[12px] font-bold tracking-[0.2em] text-mint">SANCHARA</p>
          <p className="text-[11px] text-ink-faint">Clinical portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
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
            <Icon className="h-4 w-4 shrink-0" />
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
    </>
  );

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center gap-3 border-b border-edge bg-surface px-4 py-3 lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-hi hover:text-ink"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-mint" strokeWidth={2.5} />
          <span className="text-[12px] font-bold tracking-[0.2em] text-mint">SANCHARA</span>
        </div>
      </header>

      {/* Off-canvas drawer (below lg) */}
      {drawerOpen && (
        <>
          <button
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[264px] max-w-[85vw] flex-col border-r border-edge bg-surface lg:hidden">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-hi hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </>
      )}

      {/* Permanent sidebar (lg+) */}
      <aside className="hidden w-[236px] shrink-0 flex-col border-r border-edge bg-surface lg:flex">
        {sidebar}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
