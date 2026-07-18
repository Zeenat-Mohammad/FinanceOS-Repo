import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import type { PaymentInstance } from '@/data/repositories/RecurringRepository';

const STATUS_STYLES: Record<PaymentInstance['status'], string> = {
  pending: 'bg-primary text-muted',
  overdue: 'bg-destructive/20 text-destructive',
  paid: 'bg-success/20 text-success',
  skipped: 'bg-secondary/30 text-muted'
};

export function PaymentInstanceList({
  instances,
  currency,
  limit = 8
}: {
  instances: PaymentInstance[];
  currency: string;
  limit?: number;
}) {
  const items = instances.slice(0, limit);

  if (items.length === 0) {
    return <p className="py-4 text-center text-xs text-muted">No upcoming payments scheduled.</p>;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((instance) => (
        <li key={instance.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{instance.name}</div>
            <div className="mt-0.5 text-xs text-muted">{format(parseISO(instance.scheduled_date), 'MMM d, yyyy')}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(instance.amount, currency)}</div>
            <span className={cn('mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', STATUS_STYLES[instance.status])}>
              {instance.status}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
