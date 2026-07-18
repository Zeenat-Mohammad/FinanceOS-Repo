import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { LoadingState } from '@/shared/components';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, initialized, user, initializationStatus } = useAuthStore();
  const location = useLocation();

  if (!initialized || authStatus === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (initializationStatus !== 'ready') {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted">
        <LoadingState label="Preparing your Finlo workspace" />
      </div>
    );
  }

  return <>{children}</>;
}
