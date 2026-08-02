import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { LoginPage } from '@/routes/LoginPage';
import { OverviewPage } from '@/routes/OverviewPage';
import { PlaceholderPage } from '@/routes/PlaceholderPage';

/**
 * Gate for authenticated routes. While the persisted session is being verified
 * we render a spinner rather than the login page — otherwise a page refresh
 * would flash "signed out" before /me resolves.
 */
function RequireAuth() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-mint" />
      </div>
    );
  }
  if (status === 'signedOut') return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Admin-only subtree. The backend enforces this too — never trust the client. */
function RequireAdmin() {
  const staff = useAuthStore((s) => s.staff);
  if (staff && staff.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}

function LoginRoute() {
  const status = useAuthStore((s) => s.status);
  if (status === 'signedIn') return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route
              path="patients"
              element={
                <PlaceholderPage
                  title="Patients"
                  subtitle="Search patients, review sessions and pain trends, assign programs."
                  backend="Needs a staff patients API — not built yet"
                />
              }
            />
            <Route
              path="programs"
              element={
                <PlaceholderPage
                  title="Programs"
                  subtitle="Build programs, levels and daily workouts."
                  backend="Backend ready: /api/programs (+ /levels, /days)"
                />
              }
            />
            <Route
              path="exercises"
              element={
                <PlaceholderPage
                  title="Exercises"
                  subtitle="Upload videos, edit metadata and manage the library."
                  backend="Backend ready: /api/exercises (+ /upload-video)"
                />
              }
            />

            <Route element={<RequireAdmin />}>
              <Route
                path="approvals"
                element={
                  <PlaceholderPage
                    title="Approvals"
                    subtitle="Review clinician-uploaded videos before they reach patients."
                    backend="Backend ready: /api/exercises/admin/pending"
                  />
                }
              />
              <Route
                path="audit"
                element={
                  <PlaceholderPage
                    title="Audit log"
                    subtitle="Immutable trail of clinical and admin actions."
                    backend="AuditLog model exists — needs a read endpoint"
                  />
                }
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
