import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, Page } from '@/shared/components';

export default function AdminAccessDeniedPage() {
  const location = useLocation();
  const state = location.state as { reason?: string } | null;

  return (
    <Page>
      <Card className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert aria-hidden className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">Access denied</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          This area is available only to Finlo administrators. Your account is signed in, but its Supabase Auth JWT does not contain an admin or super admin role.
        </p>
        {state?.reason ? <p className="mt-3 text-xs text-muted">Reason: {state.reason}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-button-hover)] focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Back to Dashboard
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            View Profile
          </Link>
        </div>
      </Card>
    </Page>
  );
}
