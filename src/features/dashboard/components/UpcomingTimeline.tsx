import { Link } from 'react-router-dom';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import { EmptyWidget } from './EmptyWidget';

export function UpcomingTimeline({
  items,
  currency
}: {
  items: Array<{
    id: string;
    title: string;
    amount: number;
    dueLabel: string;
    kind: string;
    daysUntil: number;
  }>;
  currency: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyWidget
        title="Nothing upcoming"
        message="Add bills or recurring rules to see your next payments and income."
        ctaLabel="Open Recurring"
        ctaTo="/recurring"
      />
    );
  }

  return (
    <Card className="transition">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Upcoming</h2>
        <Link to="/recurring" className="text-xs font-medium text-accent hover:underline">
          View all →
        </Link>
      </div>
      <ol className="relative mt-4 space-y-0 border-l border-border pl-4">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="relative pb-4 last:pb-0"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <span
              className={cn(
                'absolute -left-[21px] h-2.5 w-2.5 rounded-full border border-border bg-surface',
                item.kind === 'income' && 'bg-success/80',
                item.kind === 'bill' && 'bg-purple/80',
                item.daysUntil <= 2 && 'ring-2 ring-destructive/40'
              )}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">{item.title}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {item.daysUntil < 0
                    ? 'Overdue'
                    : item.daysUntil === 0
                      ? 'Due today'
                      : `Due in ${item.daysUntil} days`}{' '}
                  · {item.dueLabel}
                </div>
              </div>
              <div className={cn('text-sm tabular-nums', item.kind === 'income' ? 'text-success' : 'text-foreground')}>
                {item.kind === 'income' ? '+' : '-'}
                {formatCurrency(item.amount, currency)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
