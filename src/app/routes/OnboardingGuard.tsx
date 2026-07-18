import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

const allowedWhileOnboarding = new Set(['/onboarding']);

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((state) => state.profile);
  const location = useLocation();

  if (profile && !profile.onboarding_completed && !allowedWhileOnboarding.has(location.pathname)) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
