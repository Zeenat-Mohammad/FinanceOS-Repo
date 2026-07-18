import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { isAppAdmin } from '@/features/admin/adminAccess';
import { Button, ErrorState } from '@/shared/components';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!isAppAdmin(user)) {
    return (
      <ErrorState
        title="Admin access required"
        message="This workspace is only available to users with an admin role in Supabase Auth app metadata."
        action={
          <NavigateButton to="/dashboard" state={{ from: location.pathname }} />
        }
      />
    );
  }

  return <>{children}</>;
}

function NavigateButton({ to, state }: { to: string; state?: unknown }) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      onClick={() => navigate(to, { replace: true, state })}
    >
      <ShieldAlert aria-hidden className="h-4 w-4" />
      Back to Finlo
    </Button>
  );
}
