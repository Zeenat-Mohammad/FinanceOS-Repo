import { Compass, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/shared/components';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <Card className="max-w-lg p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-accent">
          <Compass aria-hidden className="h-7 w-7" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-muted">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-3 text-sm text-muted">
          This page does not exist or may have moved. Let’s get you back to Finlo.
        </p>
        <Button className="mt-6" onClick={() => navigate('/')}>
          <Home aria-hidden className="h-4 w-4" />
          Back home
        </Button>
      </Card>
    </main>
  );
}

