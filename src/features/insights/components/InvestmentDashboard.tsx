import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Area, AreaChart, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/core/utils/currency';
import type { InvestmentHolding, PortfolioSummary } from '@/types/insights';
import { InvestmentRepository } from '@/data/repositories/insights';
import { Button, EmptyState } from '@/shared/components';
import { GlassPanel, InsightsSection } from './CountrySummary';
import { cn } from '@/core/utils/cn';

const COLORS = ['#3a9d9d', '#b4a7d6', '#b6d7a8', '#474f7a', '#f59e0b', '#60a5fa', '#f472b6', '#94a3b8'];
const RANGES = ['1M', '3M', '6M', '1Y', '5Y', 'MAX'] as const;

export function InvestmentDashboard({
  portfolio,
  holdings,
  currency,
  onSelectHolding,
  onAdd
}: {
  portfolio: PortfolioSummary;
  holdings: InvestmentHolding[];
  currency: string;
  onSelectHolding: (h: InvestmentHolding) => void;
  onAdd: () => void;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>('1Y');
  const series = useMemo(() => {
    const map: Record<(typeof RANGES)[number], number> = { '1M': 4, '3M': 8, '6M': 12, '1Y': 16, '5Y': 22, MAX: 24 };
    return portfolio.series.slice(-map[range]);
  }, [portfolio.series, range]);

  const allocationData = portfolio.allocation.map((a) => ({
    name: a.class.replaceAll('_', ' '),
    value: Number(a.value.toFixed(2)),
    pct: a.pct
  }));

  if (!holdings.length) {
    return (
      <InsightsSection id="portfolio" title="Investment Portfolio" subtitle="Track holdings, allocation, and performance in one place.">
        <EmptyState title="No investments yet" message="Add your first holding to unlock portfolio intelligence." action={<Button onClick={onAdd}>Add Investment</Button>} />
      </InsightsSection>
    );
  }

  return (
    <InsightsSection id="portfolio" title="Investment Portfolio" subtitle="Bloomberg-style portfolio pulse with Finlo context." action={<Button onClick={onAdd}>Add Investment</Button>}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Portfolio Value" value={formatCurrency(portfolio.portfolioValue, currency)} />
        <Stat label="Today's Gain" value={formatCurrency(portfolio.todayGain, currency)} tone={portfolio.todayGain >= 0 ? 'up' : 'down'} />
        <Stat label="Total Gain" value={formatCurrency(portfolio.totalGain, currency)} tone={portfolio.totalGain >= 0 ? 'up' : 'down'} />
        <Stat label="Total Return" value={`${portfolio.totalReturnPct.toFixed(1)}%`} tone={portfolio.totalReturnPct >= 0 ? 'up' : 'down'} />
        <Stat label="Annual Return" value={`${portfolio.annualReturnPct.toFixed(1)}%`} />
        <Stat label="Cash Invested" value={formatCurrency(portfolio.cashInvested, currency)} />
        <Stat label="Dividend Income (est.)" value={formatCurrency(portfolio.dividendIncome, currency)} />
        <Stat label="Holdings" value={String(holdings.length)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Portfolio performance</h3>
            <div className="flex flex-wrap gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px]',
                    range === r ? 'bg-[var(--color-button)] text-white' : 'bg-white/5 text-muted hover:text-foreground'
                  )}
                  onClick={() => setRange(r)}
                >
                  {r === 'MAX' ? 'Lifetime' : r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a9d9d" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3a9d9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                <Area type="monotone" dataKey="value" stroke="#3a9d9d" fill="url(#pv)" strokeWidth={2.5} isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="xl:col-span-5">
          <h3 className="text-sm font-semibold">Asset allocation</h3>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
            {allocationData.map((row, i) => (
              <li key={row.name} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {row.name}
                </span>
                <span className="tabular-nums text-foreground">{row.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {holdings.map((holding) => {
          const m = InvestmentRepository.holdingMetrics(holding);
          return (
            <button key={holding.id} type="button" className="text-left" onClick={() => onSelectHolding(holding)}>
              <GlassPanel className="transition hover:border-[var(--color-accent-teal)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted">{holding.ticker ?? holding.asset_class}</p>
                    <h4 className="mt-1 font-semibold text-foreground">{holding.name}</h4>
                  </div>
                  <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] uppercase text-muted">{holding.asset_class.replaceAll('_', ' ')}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Metric label="Qty" value={holding.quantity.toLocaleString()} />
                  <Metric label="Price" value={formatCurrency(holding.current_price ?? holding.average_cost, currency)} />
                  <Metric label="Avg cost" value={formatCurrency(holding.average_cost, currency)} />
                  <Metric label="Value" value={formatCurrency(m.value, currency)} />
                  <Metric label="Gain/Loss" value={`${formatCurrency(m.gain, currency)} (${m.gainPct.toFixed(1)}%)`} />
                  <Metric label="Alloc" value={`${portfolio.portfolioValue ? ((m.value / portfolio.portfolioValue) * 100).toFixed(1) : 0}%`} />
                </div>
                <p className="mt-3 text-xs font-medium text-[var(--color-accent-teal)]">View details →</p>
              </GlassPanel>
            </button>
          );
        })}
      </div>
    </InsightsSection>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <GlassPanel>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-xl font-semibold tabular-nums',
          tone === 'up' && 'text-[var(--color-accent-green)]',
          tone === 'down' && 'text-red-300',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </p>
    </GlassPanel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted">{label}</p>
      <p className="font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}
