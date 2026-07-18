import { formatCurrencyMinorUnits } from '@/core/utils/currency';
import type { StrategyResult } from '@/core/debt';
import { Card } from '@/shared/components';

export function PayoffSummary({
  result,
  currency
}: {
  result: StrategyResult;
  currency: string;
}) {
  const principal = result.totalPaidMinor - result.totalInterestMinor;
  const total = Math.max(1, result.totalPaidMinor);
  const principalPct = ((principal / total) * 100).toFixed(1);
  const interestPct = ((result.totalInterestMinor / total) * 100).toFixed(1);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-foreground">Total Paid Summary</h2>
      <p className="mt-1 text-xs text-muted">Principal vs interest under the selected strategy</p>
      <div className="mt-4 text-3xl font-semibold tabular-nums text-foreground">{formatCurrencyMinorUnits(result.totalPaidMinor, currency)}</div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-primary">
        <div className="flex h-full">
          <div className="bg-success transition-all duration-700" style={{ width: `${principalPct}%` }} />
          <div className="bg-purple transition-all duration-700" style={{ width: `${interestPct}%` }} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="text-success">
          Principal {formatCurrencyMinorUnits(principal, currency)} ({principalPct}%)
        </span>
        <span className="text-purple">
          Interest {formatCurrencyMinorUnits(result.totalInterestMinor, currency)} ({interestPct}%)
        </span>
      </div>
    </Card>
  );
}
