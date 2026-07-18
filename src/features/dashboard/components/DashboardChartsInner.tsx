import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import type { ForecastBundle } from '@/core/forecast';
import { cn } from '@/core/utils/cn';

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  color: 'var(--color-foreground)'
};

export default function DashboardChartsInner({
  cashFlowHistory,
  categoryBreakdown,
  netWorthSeries,
  currency,
  range,
  onRangeChange
}: {
  cashFlowHistory: Array<{ label: string; income: number; expenses: number; net: number }>;
  categoryBreakdown: Array<{ name: string; value: number; color: string }>;
  netWorthSeries: ForecastBundle['netWorth'] | null;
  currency: string;
  range: '1M' | '3M' | '6M' | '1Y';
  onRangeChange: (r: '1M' | '3M' | '6M' | '1Y') => void;
}) {
  const money = (v: number) => formatCurrency(v, currency);
  const totalSpend = categoryBreakdown.reduce((s, c) => s + c.value, 0);

  const nwRows = (netWorthSeries?.series ?? []).map((p) => ({
    label: p.label,
    historical: p.kind === 'historical' ? p.value : null,
    forecast: p.kind === 'forecast' ? p.value : null
  }));

  const slicedNw = sliceByRange(nwRows, range);
  const slicedCash = sliceCash(cashFlowHistory, range);

  return (
    <section className="grid gap-4 xl:grid-cols-12" aria-label="Dashboard charts">
      <Card className="transition xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Net Worth</h3>
            <p className="text-[11px] text-muted">Solid = history · Dashed = forecast</p>
          </div>
          <div className="flex rounded-md border border-border bg-primary/40 p-0.5">
            {(['1M', '3M', '6M', '1Y'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={cn('rounded px-2 py-1 text-[11px]', range === r ? 'bg-accent text-white' : 'text-muted hover:text-foreground')}
                onClick={() => onRangeChange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 h-[260px] overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%" minWidth={320}>
            <AreaChart data={slicedNw.length ? slicedNw : [{ label: '—', historical: 0, forecast: null }]}>
              <defs>
                <linearGradient id="dashNw" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent-purple)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-accent-purple)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="historical" name="Historical" stroke="var(--color-accent-purple)" fill="url(#dashNw)" strokeWidth={2.5} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="var(--color-accent-teal)" strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="transition xl:col-span-4">
        <h3 className="text-sm font-semibold text-foreground">Spending by Category</h3>
        <p className="text-[11px] text-muted">{money(totalSpend)} total this month</p>
        <div className="mt-2 grid min-h-[240px] gap-3 md:grid-cols-[1fr_1.1fr]">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryBreakdown.length ? categoryBreakdown : [{ name: 'None', value: 1, color: 'var(--color-secondary)' }]} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                {(categoryBreakdown.length ? categoryBreakdown : [{ name: 'None', color: 'var(--color-secondary)' }]).map((item, i) => (
                  <Cell key={item.name} fill={item.color || ['var(--color-accent-teal)', 'var(--color-accent-purple)', 'var(--color-accent-green)'][i % 3]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-1.5 self-center text-xs">
            {categoryBreakdown.slice(0, 6).map((item, i) => (
              <li key={item.name} className="flex justify-between gap-2">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.color || 'var(--color-accent-teal)' }} />
                  {item.name}
                  <span className="text-[10px]">({totalSpend ? Math.round((item.value / totalSpend) * 100) : 0}%)</span>
                </span>
                <span className="tabular-nums text-foreground">{money(item.value)}</span>
              </li>
            ))}
            {categoryBreakdown.length === 0 ? <li className="text-muted">No spending categorized yet.</li> : null}
          </ul>
        </div>
      </Card>

      <Card className="transition xl:col-span-7">
        <h3 className="text-sm font-semibold text-foreground">Cash Flow Overview</h3>
        <p className="text-[11px] text-muted">Income vs expenses with net overlay</p>
        <div className="mt-3 h-[240px] overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%" minWidth={300}>
            <ComposedChart data={slicedCash}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="var(--color-accent-purple)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="net" name="Net" stroke="var(--color-accent-teal)" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="transition xl:col-span-5">
        <h3 className="text-sm font-semibold text-foreground">Income vs Expense</h3>
        <p className="text-[11px] text-muted">Monthly stacked comparison</p>
        <div className="mt-3 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slicedCash}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
              <Bar dataKey="income" name="Income" stackId="a" fill="var(--color-accent-green)" />
              <Bar dataKey="expenses" name="Expenses" stackId="b" fill="var(--color-secondary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}

function sliceByRange<T>(rows: T[], range: '1M' | '3M' | '6M' | '1Y'): T[] {
  const n = range === '1M' ? 2 : range === '3M' ? 4 : range === '6M' ? 8 : 14;
  return rows.slice(-Math.max(n, 1));
}

function sliceCash(
  rows: Array<{ label: string; income: number; expenses: number; net: number }>,
  range: '1M' | '3M' | '6M' | '1Y'
) {
  const n = range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : 6;
  return rows.slice(-n);
}
