import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { ForecastBundle, SeriesForecast, TimePoint } from '@/core/forecast';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  color: 'var(--color-foreground)'
};

export default function ForecastChartsInner({
  bundle,
  currency,
  showHistorical = true
}: {
  bundle: ForecastBundle;
  currency: string;
  showHistorical?: boolean;
}) {
  const money = (v: number) => formatCurrency(v, currency);
  const netWorth = toChartRows(bundle.netWorth, showHistorical);
  const cashFlow = toChartRows(bundle.cashFlow, showHistorical);
  const incomeExpense = mergeIncomeExpense(bundle, showHistorical);
  const savings = toChartRows(bundle.savings, showHistorical);
  const debt = toChartRows(bundle.debt, showHistorical);
  const investments = toChartRows(bundle.investments, showHistorical);

  return (
    <section className="grid gap-4 xl:grid-cols-12" aria-label="Forecast charts">
      <ChartCard title="Net Worth Projection" className="xl:col-span-12" subtitle="Solid = historical · Dashed = forecast · Shade = confidence">
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={netWorth}>
            <defs>
              <linearGradient id="nwFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-green)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-accent-green)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="nwBand" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-teal)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-accent-teal)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="upper" name="Upper bound" stroke="transparent" fill="url(#nwBand)" />
            <Area type="monotone" dataKey="lower" name="Lower bound" stroke="transparent" fill="var(--color-background)" />
            <Area type="monotone" dataKey="historical" name="Historical" stroke="var(--color-accent-green)" fill="url(#nwFill)" strokeWidth={2.5} connectNulls={false} />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="var(--color-accent-teal)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls={false} />
            <Brush dataKey="label" height={22} stroke="var(--color-accent-teal)" fill="var(--color-primary)" travellerWidth={8} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cash Flow" className="xl:col-span-6">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={cashFlow}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="historical" name="Historical" stroke="var(--color-accent-purple)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="var(--color-accent-teal)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Income vs Expenses" className="xl:col-span-6">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={incomeExpense}>
            <defs>
              <linearGradient id="incFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-green)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-accent-green)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="expFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-purple)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-accent-purple)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="income" name="Income" stroke="var(--color-accent-green)" fill="url(#incFill)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="var(--color-accent-purple)" fill="url(#expFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Savings Growth" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={savings}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} width={48} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="historical" stroke="var(--color-accent-green)" fill="var(--color-accent-green)" fillOpacity={0.2} strokeWidth={2} />
            <Line type="monotone" dataKey="forecast" stroke="var(--color-accent-green)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Debt Reduction" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={debt}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} width={48} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="historical" stroke="var(--color-accent-purple)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="forecast" stroke="var(--color-destructive)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Investment Growth" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={investments}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} width={48} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="historical" stroke="var(--color-accent-teal)" fill="var(--color-accent-teal)" fillOpacity={0.2} strokeWidth={2} />
            <Line type="monotone" dataKey="forecast" stroke="var(--color-accent-teal)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Goal Completion Timeline" className="xl:col-span-12">
        <div className="space-y-3">
          {bundle.goals.map((goal) => (
            <div key={goal.id} className="grid gap-2 sm:grid-cols-[160px_1fr_120px] sm:items-center">
              <div className="text-sm text-foreground">{goal.name}</div>
              <div className="h-2.5 overflow-hidden rounded-full bg-primary">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-700" style={{ width: `${Math.min(100, goal.completionPct)}%` }} />
              </div>
              <div className="text-xs text-muted">{goal.projectedCompletionLabel ?? 'Beyond horizon'}</div>
            </div>
          ))}
        </div>
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`transition ${className ?? ''}`}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle ? <p className="mt-1 text-[11px] text-muted">{subtitle}</p> : null}
      <div className="mt-3 overflow-x-auto">{children}</div>
    </Card>
  );
}

function toChartRows(series: SeriesForecast, showHistorical = true) {
  const points = showHistorical ? series.series : series.forecast;
  return points.map((point: TimePoint) => ({
    label: point.label,
    historical: point.kind === 'historical' ? point.value : null,
    forecast: point.kind === 'forecast' ? point.value : null,
    lower: point.lower ?? null,
    upper: point.upper ?? null,
    value: point.value
  }));
}

function mergeIncomeExpense(bundle: ForecastBundle, showHistorical = true) {
  return bundle.monthlyTable
    .filter((row) => showHistorical || row.kind === 'forecast')
    .map((row) => ({
      label: row.label,
      income: row.income,
      expenses: row.expenses
    }));
}
