import { ShieldCheck } from 'lucide-react';
import { Card } from '@/shared/components';

export function AdminReadOnlyNotice() {
  return (
    <Card className="flex items-start gap-3 border-accent/30 bg-accent/10">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-brand bg-accent/15 text-accent">
        <ShieldCheck aria-hidden className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">Read-only administrator workspace</h2>
        <p className="mt-1 text-sm text-muted">
          Admin pages use JWT role claims for authorization and display operational analytics only. No edit, delete, or mutation actions are available here.
        </p>
      </div>
    </Card>
  );
}
