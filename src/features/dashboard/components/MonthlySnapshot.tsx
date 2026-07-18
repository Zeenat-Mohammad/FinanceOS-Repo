import { formatCurrency, formatPercent } from '@/features/transactions-workspace/monthlyFinance';
import { Card } from '@/shared/components';

export function MonthlySnapshot({
  snapshot,
  currency,
  locale = 'en-US'
}: {
  snapshot: {
    income: number;
    expenses: number;
    savingsRate: number;
    netCash: number;
    largestExpense: number;
    largestExpenseLabel: string;
    largestIncome: number;
    largestIncomeLabel: string;
    budgetAccuracy: number;
  };
  currency: string;
  locale?: string;
}) {
  const cells = [
    { label: 'Income', value: formatCurrency(snapshot.income, currency, locale) },
    { label: 'Expenses', value: formatCurrency(snapshot.expenses, currency, locale) },
    { label: 'Savings rate', value: formatPercent(snapshot.savingsRate / 100) },
    { label: 'Net cash', value: formatCurrency(snapshot.netCash, currency, locale) },
    { label: 'Largest expense', value: `${snapshot.largestExpenseLabel} · ${formatCurrency(snapshot.largestExpense, currency, locale)}` },
    { label: 'Largest income', value: `${snapshot.largestIncomeLabel} · ${formatCurrency(snapshot.largestIncome, currency, locale)}` },
    { label: 'Budget accuracy', value: `${snapshot.budgetAccuracy.toFixed(0)}%` }
  ];

  return (
    <Card className="transition">
      <h2 className="text-sm font-semibold text-foreground">Monthly Snapshot</h2>
      <p className="mt-1 text-xs text-muted">This month at a glance</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-brand border border-border/50 bg-primary/30 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-muted">{cell.label}</div>
            <div className="mt-1 truncate text-sm font-medium tabular-nums text-foreground">{cell.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
