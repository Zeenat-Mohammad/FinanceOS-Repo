import type { LucideIcon } from 'lucide-react';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export function AdminMetricCard({
  label,
  value,
  hint,
  Icon,
  tone = 'teal'
}: {
  label: string;
  value: number;
  hint: string;
  Icon: LucideIcon;
  tone?: 'green' | 'teal' | 'purple' | 'red';
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-2 break-words text-3xl font-semibold tabular-nums text-foreground">{formatNumber(value)}</div>
          <div className="mt-2 text-xs text-muted">{hint}</div>
        </div>
        <div
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-brand',
            tone === 'green' && 'bg-success/15 text-success',
            tone === 'teal' && 'bg-accent/15 text-accent',
            tone === 'purple' && 'bg-purple/15 text-purple',
            tone === 'red' && 'bg-destructive/10 text-destructive'
          )}
        >
          <Icon aria-hidden className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}
