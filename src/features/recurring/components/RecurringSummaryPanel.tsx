import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { finloChartPalette } from '@/shared/brand';
import type { RecurringStats as RecurringStatsType } from '@/core/recurring';
import type { PaymentInstance } from '@/data/repositories/RecurringRepository';
import { PaymentInstanceList } from './PaymentInstanceList';

type Insight = { id: string; title: string; body: string; severity: 'info' | 'warning' | 'critical' };

const SEVERITY_STYLES: Record<Insight['severity'], string> = {
  info: 'border-accent/30 bg-accent/5',
  warning: 'border-[#E8A87C]/30 bg-[#E8A87C]/5',
  critical: 'border-destructive/30 bg-destructive/5'
};

export function RecurringSummaryPanel({
  stats,
  upcomingInstances,
  insights,
  currency
}: {
  stats: RecurringStatsType;
  upcomingInstances: PaymentInstance[];
  insights: Insight[];
  currency: string;
}) {
  const total = stats.monthlyIncome + stats.monthlyExpense;
  const incomePct = total > 0 ? Math.round((stats.monthlyIncome / total) * 100) : 50;
  const expensePct = total > 0 ? 100 - incomePct : 50;

  const chartData = [
    { name: 'Income', value: Math.max(stats.monthlyIncome, 0.01), color: finloChartPalette[2], real: stats.monthlyIncome },
    { name: 'Expenses', value: Math.max(stats.monthlyExpense, 0.01), color: finloChartPalette[3], real: stats.monthlyExpense }
  ];

  const legend = [
    { label: 'Income', color: 'bg-success', amount: stats.monthlyIncome, pct: incomePct },
    { label: 'Expenses', color: 'bg-accent', amount: stats.monthlyExpense, pct: expensePct }
  ];

  return (
    <aside className="space-y-4">
      <Card>
        <h2 className="text-sm font-semibold text-foreground">Income vs Expenses</h2>
        <p className="mt-1 text-xs text-muted">Monthly recurring breakdown</p>

        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={54} paddingAngle={3} stroke="none">
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(_v, _n, item) => formatCurrency(Number(item?.payload?.real ?? 0), currency)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-base font-semibold tabular-nums text-foreground">{incomePct}%</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">income</div>
              </div>
            </div>
          </div>

          <ul className="w-full space-y-3">
            {legend.map((row) => (
              <li key={row.label} className="rounded-md border border-border/60 bg-primary/40 px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.color}`} />
                  {row.label}
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3 pl-[18px]">
                  <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(row.amount, currency)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{row.pct}%</span>
                </div>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-border/60 px-1 pt-3">
              <span className="text-xs font-medium text-muted">Net monthly</span>
              <span className={`text-sm font-semibold tabular-nums ${stats.monthlyNet >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(stats.monthlyNet, currency)}
              </span>
            </li>
          </ul>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-foreground">Upcoming Payments</h2>
        <p className="mt-1 text-xs text-muted">Next scheduled instances</p>
        <div className="mt-3">
          <PaymentInstanceList instances={upcomingInstances} currency={currency} />
        </div>
      </Card>

      {insights.length > 0 ? (
        <Card>
          <h2 className="text-sm font-semibold text-foreground">Reminders</h2>
          <ul className="mt-3 space-y-2">
            {insights.map((insight) => (
              <li key={insight.id} className={`rounded-md border px-3 py-2 ${SEVERITY_STYLES[insight.severity]}`}>
                <div className="text-xs font-medium text-foreground">{insight.title}</div>
                <div className="mt-0.5 text-[11px] text-muted">{insight.body}</div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Link
        to="/calendar"
        className="card-shell flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition hover:opacity-95"
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          View payment calendar
        </span>
        <ChevronRight className="h-4 w-4 text-muted" />
      </Link>
    </aside>
  );
}
