import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { queryClient } from '@/api/queryClient';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { LoginPage } from '@/routes/LoginPage';
import { OverviewPage } from '@/routes/OverviewPage';
import { PlaceholderPage } from '@/routes/PlaceholderPage';
import { ProgramDetailPage } from '@/routes/ProgramDetailPage';
import { ProgramsPage } from '@/routes/ProgramsPage';
import { PatientsPage } from '@/routes/PatientsPage';
import { PatientDetailPage } from '@/routes/PatientDetailPage';
import { ExercisesPage } from '@/routes/ExercisesPage';
import { ApprovalsPage } from '@/routes/ApprovalsPage';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/:id" element={<ProgramDetailPage />} />
            <Route path="exercises" element={<ExercisesPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="approvals" element={<ApprovalsPage />} />
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
    </QueryClientProvider>
  );
}
