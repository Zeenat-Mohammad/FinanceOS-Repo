import { Link } from 'react-router-dom';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import { EmptyWidget } from './EmptyWidget';

export function BudgetWidget({
  rows,
  currency
}: {
  rows: Array<{
    id: string;
    label: string;
    budget: number;
    actual: number;
    remaining: number;
    progress: number;
    status: 'healthy' | 'watch' | 'over';
  }>;
  currency: string;
}) {
  if (rows.length === 0) {
    return <EmptyWidget title="No budget data" message="Categorize spending or create a budget to see progress." ctaLabel="Open Budget" ctaTo="/budget" />;
  }

  return (
    <Card className="transition">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Budget Status</h2>
        <Link to="/budget" className="text-xs font-medium text-accent hover:underline">
          View all →
        </Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.slice(0, 6).map((row) => (
          <li key={row.id} className="rounded-brand border border-border/50 bg-primary/25 p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-foreground">{row.label}</span>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase',
                  row.status === 'over' && 'text-destructive',
                  row.status === 'watch' && 'text-purple',
                  row.status === 'healthy' && 'text-success'
                )}
              >
                {row.status === 'over' ? 'Over' : row.status}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  row.status === 'over' ? 'bg-destructive' : 'bg-gradient-to-r from-accent to-success'
                )}
                style={{ width: `${Math.min(100, row.progress)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>
                {formatCurrency(row.actual, currency)} / {formatCurrency(row.budget, currency)}
              </span>
              <span className={row.remaining < 0 ? 'text-destructive' : 'text-success'}>
                {row.remaining < 0 ? 'Over ' : ''}
                {formatCurrency(Math.abs(row.remaining), currency)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
