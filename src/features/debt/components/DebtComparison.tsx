import { Lightbulb } from 'lucide-react';
import { STRATEGY_LABELS, type StrategyComparison } from '@/core/debt';
import { formatCurrencyMinorUnits } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

const DISPLAY: Array<'avalanche' | 'snowball' | 'minimum'> = ['avalanche', 'snowball', 'minimum'];

export function DebtComparison({
  comparison,
  selectedStrategy,
  currency
}: {
  comparison: StrategyComparison;
  selectedStrategy: string;
  currency: string;
}) {
  const rows = DISPLAY.map((strategy) => comparison.results.find((r) => r.strategy === strategy)).filter(Boolean);

  return (
    <Card className="h-full overflow-hidden">
      <h2 className="text-sm font-semibold text-foreground">Strategy Comparison</h2>
      <p className="mt-1 text-xs text-muted">Side-by-side payoff outcomes</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 pr-2 font-medium">Metric</th>
              {rows.map((row) => (
                <th key={row!.strategy} className="pb-2 px-2 font-medium">
                  <div className={cn(comparison.bestByInterest === row!.strategy && 'text-success')}>
                    {row!.strategy === 'minimum' ? 'Minimum' : STRATEGY_LABELS[row!.strategy].split(' (')[0]}
                    {comparison.bestByInterest === row!.strategy ? (
                      <span className="ml-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] uppercase text-success">Best</span>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <MetricRow label="Debt Free Date" values={rows.map((r) => r!.debtFreeDate?.label ?? '—')} highlight={selectedStrategy} strategies={rows.map((r) => r!.strategy)} />
            <MetricRow label="Months" values={rows.map((r) => (r!.monthsToPayoff > 0 ? String(r!.monthsToPayoff) : '—'))} highlight={selectedStrategy} strategies={rows.map((r) => r!.strategy)} />
            <MetricRow
              label="Total Interest"
              values={rows.map((r) => formatCurrencyMinorUnits(r!.totalInterestMinor, currency))}
              highlight={selectedStrategy}
              strategies={rows.map((r) => r!.strategy)}
            />
            <MetricRow
              label="Interest Saved"
              values={rows.map((r) => formatCurrencyMinorUnits(r!.interestSavedMinor, currency))}
              highlight={selectedStrategy}
              strategies={rows.map((r) => r!.strategy)}
              emphasize
            />
            <MetricRow
              label="Total Paid"
              values={rows.map((r) => formatCurrencyMinorUnits(r!.totalPaidMinor, currency))}
              highlight={selectedStrategy}
              strategies={rows.map((r) => r!.strategy)}
            />
          </tbody>
        </table>
      </div>

      {comparison.results.find((r) => r.strategy === 'avalanche') ? (
        <div className="mt-4 flex gap-2 rounded-brand border border-success/30 bg-success/10 p-3 text-sm text-foreground">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p>
            Avalanche will save you {formatCurrencyMinorUnits(comparison.results.find((r) => r.strategy === 'avalanche')!.interestSavedMinor, currency)} and{' '}
            {Math.max(0, comparison.minimumBaseline.monthsToPayoff - (comparison.results.find((r) => r.strategy === 'avalanche')?.monthsToPayoff ?? 0))} months compared to
            paying minimum payments.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function MetricRow({
  label,
  values,
  strategies,
  highlight,
  emphasize
}: {
  label: string;
  values: string[];
  strategies: string[];
  highlight: string;
  emphasize?: boolean;
}) {
  return (
    <tr>
      <td className="py-2.5 pr-2 text-xs text-muted">{label}</td>
      {values.map((value, index) => (
        <td
          key={`${label}-${strategies[index]}`}
          className={cn(
            'px-2 py-2.5 tabular-nums',
            strategies[index] === highlight && 'bg-primary/40 font-medium',
            emphasize && 'text-success'
          )}
        >
          {value}
        </td>
      ))}
    </tr>
  );
}
