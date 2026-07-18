import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import type { ForecastBundle } from '@/core/forecast';
import { cn } from '@/core/utils/cn';
import { ResponsiveCategoryChart, type CategoryChartDatum } from '@/shared/components/ResponsiveCategoryChart';

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  color: 'var(--color-foreground)'
};

type CashFlowRow = { label: string; income: number; expenses: number; net: number };
type NetWorthChartRow = { label: string; historical: number | null; forecast: number | null };
type ChartRange = '1M' | '3M' | '6M' | '1Y';

export default function DashboardChartsInner({
  cashFlowHistory,
  categoryBreakdown,
  netWorthSeries,
  currency,
  range,
  onRangeChange,
  onCategoryClick
}: {
  cashFlowHistory: CashFlowRow[];
  categoryBreakdown: CategoryChartDatum[];
  netWorthSeries: ForecastBundle['netWorth'] | null;
  currency: string;
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
  onCategoryClick?: (category: CategoryChartDatum) => void;
}) {
  const money = (value: number) => formatCurrency(value, currency);

  const nwRows: NetWorthChartRow[] = (netWorthSeries?.series ?? []).map((point) => ({
    label: point.label,
    historical: point.kind === 'historical' ? point.value : null,
    forecast: point.kind === 'forecast' ? point.value : null
  }));

  const slicedNw = sliceByRange(nwRows, range);
  const slicedCash = sliceCash(cashFlowHistory, range);
  const hasNetWorthData = hasUsableNetWorthData(slicedNw);

  return (
    <section className="grid gap-4 xl:grid-cols-12" aria-label="Dashboard charts">
      {hasNetWorthData ? (
        <Card className="transition xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Net Worth</h3>
              <p className="text-[11px] text-muted">Solid = history · Dashed = forecast</p>
            </div>
            <RangeSelector range={range} onRangeChange={onRangeChange} />
          </div>
          <div className="mt-3 h-[260px] overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={320}>
              <AreaChart data={slicedNw}>
                <defs>
                  <linearGradient id="dashNw" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent-purple)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-accent-purple)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="historical" name="Historical" stroke="var(--color-accent-purple)" fill="url(#dashNw)" strokeWidth={2.5} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="var(--color-accent-teal)" strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      <Card className={cn('transition', hasNetWorthData ? 'xl:col-span-4' : 'xl:col-span-12')}>
        <ResponsiveCategoryChart data={categoryBreakdown} currency={currency} onCategoryClick={onCategoryClick} />
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
              <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
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
              <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
              <Bar dataKey="income" name="Income" stackId="a" fill="var(--color-accent-green)" />
              <Bar dataKey="expenses" name="Expenses" stackId="b" fill="var(--color-secondary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}

function RangeSelector({ range, onRangeChange }: { range: ChartRange; onRangeChange: (range: ChartRange) => void }) {
  return (
    <div className="flex rounded-md border border-border bg-primary/40 p-0.5">
      {(['1M', '3M', '6M', '1Y'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={cn('rounded px-2 py-1 text-[11px]', range === option ? 'bg-accent text-white' : 'text-muted hover:text-foreground')}
          onClick={() => onRangeChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function hasUsableNetWorthData(rows: NetWorthChartRow[]) {
  return rows.some((row) => {
    const values = [row.historical, row.forecast];
    return values.some((value) => typeof value === 'number' && Number.isFinite(value) && value !== 0);
  });
}

function sliceByRange<T>(rows: T[], range: ChartRange): T[] {
  const n = range === '1M' ? 2 : range === '3M' ? 4 : range === '6M' ? 8 : 14;
  return rows.slice(-Math.max(n, 1));
}

function sliceCash(rows: CashFlowRow[], range: ChartRange) {
  const n = range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : 6;
  return rows.slice(-n);
}
