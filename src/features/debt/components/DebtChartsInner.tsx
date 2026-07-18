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
import { STRATEGY_LABELS } from '@/core/debt';
import { formatCurrencyMinorUnits } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import type { SimulationBundle } from '../useDebtSimulation';
import type { DebtAccount } from '@/types/debt';

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  color: 'var(--color-foreground)'
};

const COLORS = [
  'var(--color-accent-teal)',
  'var(--color-accent-purple)',
  'var(--color-accent-green)',
  'var(--color-secondary)',
  'var(--color-primary)'
];

export default function DebtChartsInner({
  simulation,
  debts,
  currency
}: {
  simulation: SimulationBundle;
  debts: DebtAccount[];
  currency: string;
}) {
  const money = (v: number) => formatCurrencyMinorUnits(Math.round(v), currency);
  const active = debts.filter((d) => d.status === 'active' && !d.deleted_at && d.balance_minor > 0);

  const balanceSeries = buildAlignedSeries(simulation);
  const interestPrincipal = simulation.selected.schedule.map((row) => ({
    label: row.label,
    interest: row.totalInterestMinor / 100,
    principal: row.totalPrincipalMinor / 100
  }));

  const distribution = active.map((d) => ({
    name: d.name,
    value: d.balance_minor / 100
  }));

  const monthlyPayments = simulation.selected.monthlyBalances.map((row) => ({
    label: row.label,
    payment: row.paymentMinor / 100
  }));

  const strategyBars = simulation.comparison.results
    .filter((r) => r.strategy !== 'minimum' || true)
    .filter((r) => ['avalanche', 'snowball', 'custom', 'minimum'].includes(r.strategy))
    .map((r) => ({
      name: r.strategy === 'minimum' ? 'Minimum' : STRATEGY_LABELS[r.strategy].split(' (')[0],
      months: r.monthsToPayoff > 0 ? r.monthsToPayoff : 0,
      interest: r.totalInterestMinor / 100,
      saved: r.interestSavedMinor / 100
    }));

  const stepEvery = Math.max(1, Math.floor(balanceSeries.length / 8));

  return (
    <section className="grid gap-4 xl:grid-cols-12" aria-label="Debt charts">
      <ChartCard title="Balance Over Time" className="xl:col-span-8">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={balanceSeries}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} interval={stepEvery} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(value) => money(Number(value) * 100)} contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="avalanche" name="Avalanche" stroke="var(--color-accent-green)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="snowball" name="Snowball" stroke="var(--color-accent-purple)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="minimum" name="Minimum" stroke="var(--color-secondary)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Debt Distribution" className="xl:col-span-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
              {distribution.map((item, index) => (
                <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value) * 100)} contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Interest vs Principal" className="xl:col-span-6">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={interestPrincipal}>
            <defs>
              <linearGradient id="interestGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-purple)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-accent-purple)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="principalGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-green)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-accent-green)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} interval={stepEvery} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(value) => money(Number(value) * 100)} contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="principal" name="Principal" stackId="1" stroke="var(--color-accent-green)" fill="url(#principalGrad)" />
            <Area type="monotone" dataKey="interest" name="Interest" stackId="1" stroke="var(--color-accent-purple)" fill="url(#interestGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly Payments" className="xl:col-span-6">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyPayments.filter((_, i) => i % Math.max(1, Math.floor(monthlyPayments.length / 24)) === 0)}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(value) => money(Number(value) * 100)} contentStyle={tooltipStyle} />
            <Bar dataKey="payment" name="Payment" fill="var(--color-accent-teal)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Strategy Comparison" className="xl:col-span-12">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={strategyBars}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(value, name) => (name === 'months' ? value : money(Number(value) * 100))} contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="months" name="Months" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="interest" name="Interest" fill="var(--color-accent-purple)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saved" name="Interest Saved" fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

function buildAlignedSeries(simulation: SimulationBundle) {
  const avalanche = simulation.comparison.results.find((r) => r.strategy === 'avalanche');
  const snowball = simulation.comparison.results.find((r) => r.strategy === 'snowball');
  const minimum = simulation.comparison.minimumBaseline;

  const maxLen = Math.max(
    avalanche?.monthlyBalances.length ?? 0,
    snowball?.monthlyBalances.length ?? 0,
    minimum.monthlyBalances.length
  );

  const series = [];
  for (let i = 0; i < maxLen; i++) {
    const label =
      avalanche?.monthlyBalances[i]?.label ??
      snowball?.monthlyBalances[i]?.label ??
      minimum.monthlyBalances[i]?.label ??
      `M${i + 1}`;
    series.push({
      label,
      avalanche: (avalanche?.monthlyBalances[i]?.balanceMinor ?? 0) / 100,
      snowball: (snowball?.monthlyBalances[i]?.balanceMinor ?? 0) / 100,
      minimum: (minimum.monthlyBalances[i]?.balanceMinor ?? 0) / 100
    });
  }
  return series;
}
