import { CheckCircle2 } from 'lucide-react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BrandLogo, Card } from '@/shared/components';
import { useAuthStore } from './authStore';

export default function EmailVerifiedPage() {
  const { user, profile, initializationStatus } = useAuthStore();
  const [params] = useSearchParams();
  const location = useLocation();
  const combinedParams = new URLSearchParams(`${params.toString()}&${location.hash.replace(/^#/, '')}`);
  const error = combinedParams.get('error') || combinedParams.get('error_code');

  if (error) {
    const target = error.includes('expired') ? '/auth/email-expired' : '/auth/email-error';
    return <Navigate to={`${target}?${combinedParams.toString()}`} replace />;
  }

  if (user && initializationStatus === 'ready') {
    return <Navigate to={profile?.onboarding_completed ? '/' : '/onboarding'} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md p-6 text-center">
        <BrandLogo className="mb-6 justify-center" />
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 text-xl font-semibold">Email verified</h1>
        <p className="mt-2 text-sm text-muted">Your email has been verified. Sign in to finish setting up your Finlo workspace.</p>
        <Link className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary" to="/login">
          Go to Sign In
        </Link>
      </Card>
    </div>
  );
}
