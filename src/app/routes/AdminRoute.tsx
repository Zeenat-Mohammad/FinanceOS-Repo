import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { LoadingState } from '@/shared/components';

export function AdminRoute({ children }: { children: ReactNode }) {
  const admin = useAdmin();
  const location = useLocation();

  if (admin.isLoading) {
    return <LoadingState label="Checking admin access" />;
  }

  if (!admin.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!admin.isAdmin) {
    return (
      <Navigate
        to="/admin/access-denied"
        replace
        state={{
          from: location.pathname,
          reason: 'Missing admin role in JWT app_metadata.'
        }}
      />
    );
  }

  return <>{children}</>;
}
