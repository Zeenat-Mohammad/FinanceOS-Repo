import { Activity, AlertTriangle } from 'lucide-react';
import type { AdminSecurityEvent } from '@/types/admin';
import { Card } from '@/shared/components';

export function AdminEventPanel({
  title,
  description,
  events,
  empty,
  attention
}: {
  title: string;
  description: string;
  events: AdminSecurityEvent[];
  empty: string;
  attention?: boolean;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {attention ? <AlertTriangle aria-hidden className="h-5 w-5 text-destructive" /> : <Activity aria-hidden className="h-5 w-5 text-accent" />}
      </div>

      {events.length === 0 ? (
        <div className="rounded-brand border border-dashed border-border p-5 text-sm text-muted">{empty}</div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <div key={event.id} className="rounded-brand border border-border/60 bg-primary/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{event.eventType.replaceAll('_', ' ')}</div>
                  <div className="mt-1 truncate text-xs text-muted">{event.userId}</div>
                </div>
                <time className="shrink-0 text-xs text-muted">{formatTime(event.createdAt)}</time>
              </div>
              {Object.keys(event.metadata ?? {}).length > 0 ? (
                <pre className="mt-2 max-h-20 overflow-auto rounded-md bg-background/60 p-2 text-[11px] text-muted">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}
