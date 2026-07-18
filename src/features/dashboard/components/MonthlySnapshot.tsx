import { formatCurrency, formatPercent } from '@/features/transactions-workspace/monthlyFinance';
import { Card } from '@/shared/components';

type SnapshotCell = {
  label: string;
  value: string;
  detail?: string;
};

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
  const cells: SnapshotCell[] = [
    { label: 'Income', value: formatCurrency(snapshot.income, currency, locale) },
    { label: 'Expenses', value: formatCurrency(snapshot.expenses, currency, locale) },
    { label: 'Savings rate', value: formatPercent(snapshot.savingsRate / 100) },
    { label: 'Net cash', value: formatCurrency(snapshot.netCash, currency, locale) },
    {
      label: 'Largest expense',
      value: formatCurrency(snapshot.largestExpense, currency, locale),
      detail: snapshot.largestExpenseLabel
    },
    {
      label: 'Largest income',
      value: formatCurrency(snapshot.largestIncome, currency, locale),
      detail: snapshot.largestIncomeLabel
    },
    { label: 'Budget accuracy', value: `${snapshot.budgetAccuracy.toFixed(0)}%` }
  ];

  return (
    <Card className="h-full transition">
      <h2 className="text-sm font-semibold text-foreground">Monthly Snapshot</h2>
      <p className="mt-1 text-xs text-muted">This month at a glance</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {cells.map((cell) => (
          <SnapshotTile key={cell.label} cell={cell} />
        ))}
      </div>
    </Card>
  );
}

function SnapshotTile({ cell }: { cell: SnapshotCell }) {
  return (
    <div
      className="min-w-0 rounded-brand border border-border/50 bg-primary/30 px-3 py-2.5"
      title={cell.detail ? `${cell.detail} · ${cell.value}` : cell.value}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted">{cell.label}</div>
      {cell.detail ? (
        <div className="mt-1 min-w-0">
          <div className="truncate text-[11px] text-muted">{cell.detail}</div>
          <div className="break-words text-[13px] font-semibold leading-tight tabular-nums text-foreground">
            {cell.value}
          </div>
        </div>
      ) : (
        <div className="mt-1 break-words text-[13px] font-semibold leading-tight tabular-nums text-foreground sm:text-sm">
          {cell.value}
        </div>
      )}
    </div>
  );
}
