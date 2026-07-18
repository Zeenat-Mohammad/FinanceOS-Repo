import type { MonthlyForecastRow } from '@/core/forecast';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export function ForecastTable({ rows, currency }: { rows: MonthlyForecastRow[]; currency: string }) {
  const forecastRows = rows.filter((r) => r.kind === 'forecast');
  return (
    <Card className="transition">
      <h2 className="text-sm font-semibold text-foreground">Monthly Prediction Table</h2>
      <p className="mt-1 text-xs text-muted">Scrollable forecast ledger — not a spreadsheet workflow</p>
      <div className="mt-4 max-h-[420px] overflow-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-border text-left text-xs text-muted">
              {['Month', 'Income', 'Expenses', 'Savings', 'Debt', 'Investment', 'Net Worth', 'Cash Flow', 'Score'].map((h) => (
                <th key={h} className="px-2 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecastRows.map((row) => (
              <tr key={row.label} className="border-b border-border/50 hover:bg-primary/30">
                <td className="px-2 py-2.5 font-medium">{row.label}</td>
                <td className="px-2 py-2.5 tabular-nums">{formatCurrency(row.income, currency)}</td>
                <td className="px-2 py-2.5 tabular-nums">{formatCurrency(row.expenses, currency)}</td>
                <td className="px-2 py-2.5 tabular-nums text-success">{formatCurrency(row.savings, currency)}</td>
                <td className="px-2 py-2.5 tabular-nums text-purple">{formatCurrency(row.debt, currency)}</td>
                <td className="px-2 py-2.5 tabular-nums">{formatCurrency(row.investment, currency)}</td>
                <td className="px-2 py-2.5 tabular-nums font-medium">{formatCurrency(row.netWorth, currency)}</td>
                <td className={cn('px-2 py-2.5 tabular-nums', row.cashFlow >= 0 ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(row.cashFlow, currency)}
                </td>
                <td className="px-2 py-2.5 tabular-nums">{row.financialScore.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
