import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '@/shared/components';
import { OnboardingGuard } from './OnboardingGuard';
import { ProtectedRoute } from './ProtectedRoute';
import { NotFoundPage, protectedRoutes, publicRoutes, ShellLayout } from './routeGroups';

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-muted">
      <LoadingState label="Loading route" />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {publicRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={<route.element />} />
        ))}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <ShellLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          {protectedRoutes.map((route) => {
            const path = route.path === '/' ? undefined : route.path.replace(/^\//, '');
            return <Route key={route.path} index={route.path === '/'} path={path} element={<route.element />} />;
          })}
        </Route>

        <Route path="/forecast" element={<Navigate to="/reports" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
