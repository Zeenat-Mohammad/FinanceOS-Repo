import { Link } from 'react-router-dom';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import { EmptyWidget } from './EmptyWidget';
import { Sparkline } from './Sparkline';

export function DebtWidget({
  debt,
  currency
}: {
  debt: {
    total: number;
    monthlyPayment: number;
    interestRemaining: number;
    debtFreeDate: string | null;
    monthsRemaining: number;
    sparkline: number[];
  };
  currency: string;
}) {
  if (debt.total <= 0) {
    return <EmptyWidget title="No active debt" message="Track loans and cards in Debt Center when you're ready." ctaLabel="Open Debt Center" ctaTo="/debt" />;
  }

  return (
    <Card className="transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Debt</h2>
          <p className="mt-1 text-xs text-muted">Payoff progress from Debt Center</p>
        </div>
        <Link to="/debt" className="text-xs font-medium text-accent hover:underline">
          View Debt Center →
        </Link>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted">Total debt</div>
          <div className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(debt.total, currency)}</div>
        </div>
        <Sparkline values={debt.sparkline.length ? debt.sparkline : [debt.total]} tone="purple" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Metric label="Monthly payment" value={formatCurrency(debt.monthlyPayment, currency)} />
        <Metric label="Interest remaining" value={formatCurrency(debt.interestRemaining, currency)} />
        <Metric label="Debt free" value={debt.debtFreeDate ?? '—'} />
        <Metric
          label="Months left"
          value={debt.monthsRemaining > 0 ? String(debt.monthsRemaining) : '—'}
          tone="success"
        />
      </div>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="rounded-md border border-border/50 bg-primary/30 px-2.5 py-2">
      <div className="text-muted">{label}</div>
      <div className={cn('mt-0.5 font-medium tabular-nums text-foreground', tone === 'success' && 'text-success')}>{value}</div>
    </div>
  );
}
