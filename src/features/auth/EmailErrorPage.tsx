import { AlertTriangle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrandLogo, Card } from '@/shared/components';

export default function EmailErrorPage() {
  const [params] = useSearchParams();
  const message = params.get('error_description') ?? params.get('error') ?? 'We could not verify this email link.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md p-6 text-center">
        <BrandLogo className="mb-6 justify-center" />
        <AlertTriangle className="mx-auto h-12 w-12 text-purple" />
        <h1 className="mt-4 text-xl font-semibold">Email verification error</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link className="text-success hover:text-accent" to="/auth/verify-email">
            Resend email
          </Link>
          <Link className="text-muted hover:text-white" to="/login">
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
