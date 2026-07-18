import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card } from '@/shared/components';
import { formatCurrency, type MonthlyWorkspaceModel } from './monthlyFinance';

type MonthlyChartsProps = {
  model: MonthlyWorkspaceModel;
  currency: string;
  locale: string;
};

const palette = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent-green)',
  'var(--color-accent-purple)',
  'var(--color-accent-teal)'
];

export default function MonthlyCharts({ model, currency, locale }: MonthlyChartsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-12" aria-label="Monthly finance charts">
      <ChartCard title="Income vs Expense" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={model.dailySeries}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-green)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-accent-green)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-purple)" stopOpacity={0.42} />
                <stop offset="100%" stopColor="var(--color-accent-purple)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={tooltipStyle} />
            <Legend />
            <Area dataKey="income" name="Income" stroke="var(--color-accent-green)" fill="url(#incomeGradient)" strokeWidth={2} />
            <Area dataKey="expenses" name="Expenses" stroke="var(--color-accent-purple)" fill="url(#expenseGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Category Breakdown" className="xl:col-span-4">
        <div className="grid min-h-[230px] gap-4 md:grid-cols-[1fr_1.1fr]">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={model.categoryBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2}>
                {model.categoryBreakdown.map((item, index) => (
                  <Cell key={item.name} fill={item.color || palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 self-center">
            {model.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted">No expense categories for this month yet.</p>
            ) : (
              model.categoryBreakdown.slice(0, 6).map((item, index) => (
                <div className="flex items-center justify-between gap-3 text-sm" key={item.name}>
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color || palette[index % palette.length] }} />
                    {item.name}
                  </span>
                  <span className="font-medium text-foreground">{formatCurrency(item.value, currency, locale)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Daily Spending" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={model.dailySeries}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="spending" stroke="var(--color-accent-teal)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cash Flow" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={model.dailySeries}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={tooltipStyle} />
            <Bar dataKey="net" radius={[6, 6, 0, 0]} fill="var(--color-accent-teal)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Weekly Spending" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={model.weeklySeries}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="spending" stackId="a" fill="var(--color-accent-purple)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="savings" stackId="a" fill="var(--color-accent-green)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Expense Calendar" className="xl:col-span-4">
        <div className="grid grid-cols-7 gap-1.5">
          {model.heatmap.map((day) => (
            <span
              aria-label={`${day.date}: ${formatCurrency(day.value, currency, locale)} spent`}
              className={heatmapClass(day.level)}
              key={day.date}
              title={`${day.date}: ${formatCurrency(day.value, currency, locale)}`}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => <span className={heatmapClass(level)} key={level} />)}
          </div>
          <span>More</span>
        </div>
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted">Derived from ledger</span>
      </div>
      {children}
    </Card>
  );
}

function heatmapClass(level: number) {
  const colors = [
    'bg-surface-muted/70',
    'bg-secondary',
    'bg-accent/60',
    'bg-accent',
    'bg-success'
  ];
  return `block h-7 rounded-md border border-border ${colors[level] ?? colors[0]}`;
}

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.75rem',
  color: 'var(--color-foreground)'
};

