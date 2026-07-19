import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LoadingState } from '@/shared/components';
import { AdminRoute } from './AdminRoute';
import { OnboardingGuard } from './OnboardingGuard';
import { ProtectedRoute } from './ProtectedRoute';
import { adminRoutes, NotFoundPage, protectedRoutes, publicRoutes, ShellLayout } from './routeGroups';

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
              <ShellLayout />
            </ProtectedRoute>
          }
        >
          {protectedRoutes.map((route) => {
            const path = route.path === '/' ? undefined : route.path.replace(/^\//, '');
            const Element = route.element;
            const isAccessDeniedRoute = route.path === '/access-denied';
            return (
              <Route
                key={route.path}
                index={route.path === '/'}
                path={path}
                element={
                  isAccessDeniedRoute ? (
                    <Element />
                  ) : (
                    <OnboardingGuard>
                      <Element />
                    </OnboardingGuard>
                  )
                }
              />
            );
          })}

          {adminRoutes.map((route) => {
            const Element = route.element;
            return (
              <Route
                key={route.path}
                path={route.path.replace(/^\//, '')}
                element={
                  <AdminRoute>
                    <Element />
                  </AdminRoute>
                }
              />
            );
          })}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
