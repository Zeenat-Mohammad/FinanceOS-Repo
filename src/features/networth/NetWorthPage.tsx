import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  CircleDashed,
  Landmark,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet,
  WalletCards
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, LoadingState, Page } from '@/shared/components';
import { formatCurrency } from '@/core/utils/currency';
import { queryKeys } from '@/data/query-keys';
import { NetWorthRepository } from '@/data/repositories/NetWorthRepository';
import { useForecast, DEFAULT_ASSUMPTIONS } from '@/features/forecast/useForecast';
import { cn } from '@/core/utils/cn';
import { GlassPanel } from '@/features/insights/components/CountrySummary';
import type { WaterfallStep } from '@/types/wealth';

const RANGE_OPTIONS = [
  { id: 'monthly', label: 'Monthly', months: 12 },
  { id: 'yearly', label: 'Yearly', months: 12 },
  { id: '5y', label: '5 Years', months: 12 },
  { id: 'lifetime', label: 'Lifetime', months: 12 }
] as const;

const COLORS = ['#3a9d9d', '#b6d7a8', '#b4a7d6', '#474f7a', '#f59e0b', '#60a5fa', '#f472b6', '#94a3b8', '#34d399'];

const ASSET_ICONS: Record<string, typeof Wallet> = {
  cash: Wallet,
  investments: TrendingUp,
  property: Building2,
  vehicles: Car,
  gold: Landmark,
  crypto: Sparkles,
  emergency_fund: PiggyBank,
  business: Briefcase,
  other: WalletCards
};

export default function NetWorthPage() {
  const { user, profile, household } = useAuthStore();
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const year = new Date().getFullYear();
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['id']>('monthly');
  const [tableMode, setTableMode] = useState<'monthly' | 'yearly'>('monthly');
  const [barMode, setBarMode] = useState<'monthly' | 'yearly'>('monthly');

  const forecast = useForecast({
    householdId: household?.id,
    userId: user?.id,
    horizon: 24,
    scenario: 'expected',
    assumptions: DEFAULT_ASSUMPTIONS,
    activeWhatIfs: [],
    refreshKey: 0
  });

  const projected = useMemo(() => {
    const series = forecast.bundle?.netWorth?.forecast ?? [];
    const pick = (months: number) => series[Math.min(months - 1, series.length - 1)]?.value;
    return [
      { years: 1, value: pick(12) ?? 0 },
      { years: 3, value: pick(36) ?? 0 },
      { years: 5, value: pick(60) ?? 0 },
      { years: 10, value: pick(120) ?? 0 }
    ].filter((p) => p.value > 0);
  }, [forecast.bundle]);

  const query = useQuery({
    queryKey: queryKeys.netWorth.bundle(household?.id ?? 'none'),
    enabled: Boolean(household?.id && user?.id),
    queryFn: () =>
      NetWorthRepository.loadBundle({
        householdId: household!.id,
        userId: user!.id,
        currency,
        projectedNetWorthByYear: projected.length ? projected : undefined
      })
  });

  if (!household || !user) return <LoadingState label="Loading Net Worth" />;
  if (query.isLoading || !query.data) return <LoadingState label="Calculating your wealth" />;

  const bundle = query.data;
  const o = bundle.overview;
  const money = (n: number) => formatCurrency(n, currency);

  return (
    <Page className="space-y-8 pb-16">
      <header className="insights-glass relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(58,157,157,0.25),transparent_42%),radial-gradient(circle_at_left,rgba(180,167,214,0.16),transparent_40%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-white/5 px-3 py-1 text-xs text-muted">
              <WalletCards className="h-3.5 w-3.5 text-[var(--color-accent-teal)]" />
              Flagship wealth desk
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Net Worth</h1>
            <p className="mt-2 text-sm text-muted">Track how your wealth changes over time</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="select w-auto" defaultValue={year} aria-label="Year">
              <option value={year}>{year}</option>
              <option value={year - 1}>{year - 1}</option>
            </select>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <GlassPanel className="sm:col-span-2 xl:col-span-1">
            <p className="text-xs uppercase tracking-wide text-muted">Current Net Worth</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{money(o.currentNetWorth)}</p>
            <p className={cn('mt-2 inline-flex items-center gap-1 text-sm', o.delta >= 0 ? 'text-[var(--color-accent-green)]' : 'text-red-300')}>
              {o.delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {o.delta >= 0 ? '+' : ''}
              {money(o.delta)} · {o.deltaPct >= 0 ? '+' : ''}
              {o.deltaPct.toFixed(1)}% this period
            </p>
            <div className="mt-3 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bundle.trend}>
                  <Area type="monotone" dataKey="netWorth" stroke="#b6d7a8" fill="#b6d7a8" fillOpacity={0.25} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
          <Kpi label="Total Assets" value={money(o.totalAssets)} hint={`▲ ${o.assetsChangePct.toFixed(1)}% vs last month`} positive />
          <Kpi label="Total Liabilities" value={money(o.totalLiabilities)} hint={`▼ ${Math.abs(o.liabilitiesChangePct).toFixed(1)}% vs last month`} positive={false} />
          <Kpi label="Annual Growth" value={`▲ ${o.annualGrowthPct.toFixed(1)}%`} hint={`${money(o.currentNetWorth - o.lowest)} vs year start`} accent="purple" />
        </div>

        <div className="relative mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Monthly Growth" value={`+${o.monthlyGrowthPct.toFixed(1)}%`} />
          <MiniStat label="Highest Net Worth" value={money(o.highest)} />
          <MiniStat label="Lowest" value={money(o.lowest)} />
          <MiniStat label="Assets − Liabilities" value={money(o.totalAssets - o.totalLiabilities)} />
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Net Worth Trend</h2>
            <div className="flex flex-wrap gap-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px]',
                    range === opt.id ? 'bg-[var(--color-button)] text-white' : 'bg-white/5 text-muted hover:text-foreground'
                  )}
                  onClick={() => setRange(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bundle.trend}>
                <defs>
                  <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a9d9d" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3a9d9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(180,167,214,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#3a9d9d" fill="url(#nwFill)" strokeWidth={2.5} isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Assets vs Liabilities</h2>
            <div className="flex gap-1">
              {(['monthly', 'yearly'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn('rounded-md px-2 py-1 text-[11px] capitalize', barMode === m ? 'bg-[var(--color-button)] text-white' : 'bg-white/5 text-muted')}
                  onClick={() => setBarMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bundle.trend}>
                <CartesianGrid stroke="rgba(180,167,214,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="assets" name="Assets" stackId="a" fill="#b6d7a8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="liabilities" name="Liabilities" stackId="b" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-5">
          <h2 className="text-sm font-semibold">Asset Distribution</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-[1fr_1fr] md:items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bundle.distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2}>
                    {bundle.distribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-center text-xs text-muted md:text-left">Total Assets</p>
              <p className="text-center text-lg font-semibold tabular-nums md:text-left">{money(o.totalAssets)}</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {bundle.distribution.map((row, i) => (
                  <li key={row.name} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {row.name}
                    </span>
                    <span className="tabular-nums text-muted">{row.pct.toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="xl:col-span-7">
          <h2 className="text-sm font-semibold">Wealth Growth Breakdown</h2>
          <p className="mt-1 text-xs text-muted">Waterfall from income to current net worth</p>
          <div className="mt-4 space-y-2">
            {bundle.waterfall.map((step) => (
              <WaterfallRow key={step.id} step={step} currency={currency} max={Math.max(...bundle.waterfall.map((s) => Math.abs(s.value)))} />
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Assets</h2>
            <a href="/accounts" className="text-xs text-[var(--color-accent-teal)] hover:underline">
              View all assets →
            </a>
          </div>
          <div className="space-y-2">
            {bundle.assets.map((asset) => {
              const Icon = ASSET_ICONS[asset.category] ?? Wallet;
              return (
                <div key={asset.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-white/5 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[rgba(58,157,157,0.15)] text-[var(--color-accent-teal)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{asset.label}</p>
                      <p className="text-xs text-muted">{money(asset.value)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-xs font-medium', asset.changePct >= 0 ? 'text-[var(--color-accent-green)]' : 'text-red-300')}>
                      {asset.changePct >= 0 ? '+' : ''}
                      {asset.changePct.toFixed(1)}%
                    </p>
                    <Button className="mt-1 h-7 border border-border bg-transparent px-2 text-xs text-foreground" onClick={() => undefined}>
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Liabilities</h2>
            <a href="/debt" className="text-xs text-[var(--color-accent-teal)] hover:underline">
              Open Debt Center →
            </a>
          </div>
          <div className="space-y-2">
            {bundle.liabilities.map((liability) => (
              <div key={liability.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-white/5 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{liability.label}</p>
                  {liability.subtitle ? <p className="text-xs text-muted">{liability.subtitle}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{money(liability.balance)}</p>
                  <p className={cn('text-xs', liability.changePct >= 0 ? 'text-red-300' : 'text-[var(--color-accent-green)]')}>
                    {liability.changePct >= 0 ? '+' : ''}
                    {liability.changePct.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      <GlassPanel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Net Worth Overview</h2>
          <div className="flex gap-1">
            {(['monthly', 'yearly'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={cn('rounded-md px-2 py-1 text-[11px] capitalize', tableMode === m ? 'bg-[var(--color-button)] text-white' : 'bg-white/5 text-muted')}
                onClick={() => setTableMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2">Month</th>
                <th className="px-2 py-2">Net Worth</th>
                <th className="px-2 py-2">Assets</th>
                <th className="px-2 py-2">Liabilities</th>
                <th className="px-2 py-2">Growth</th>
                <th className="px-2 py-2">Savings Rate</th>
                <th className="px-2 py-2">Investment Gain</th>
              </tr>
            </thead>
            <tbody>
              {bundle.table.map((row) => (
                <tr key={row.month} className="border-t border-border/30">
                  <td className="px-2 py-2.5 font-medium">{row.label}</td>
                  <td className="px-2 py-2.5 tabular-nums">{money(row.netWorth)}</td>
                  <td className="px-2 py-2.5 tabular-nums">{money(row.assets)}</td>
                  <td className="px-2 py-2.5 tabular-nums">{money(row.liabilities)}</td>
                  <td className={cn('px-2 py-2.5 tabular-nums', row.growthPct >= 0 ? 'text-[var(--color-accent-green)]' : 'text-red-300')}>
                    {row.growthPct >= 0 ? '▲' : '▼'} {Math.abs(row.growthPct).toFixed(2)}%
                  </td>
                  <td className="px-2 py-2.5 tabular-nums">{row.savingsRatePct.toFixed(0)}%</td>
                  <td className="px-2 py-2.5 tabular-nums">{money(row.investmentGain)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <section className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-4 ring-1 ring-[rgba(180,167,214,0.35)]">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-accent-purple)]" />
            <h2 className="text-sm font-semibold">AI Insights</h2>
          </div>
          <ul className="space-y-3 text-sm">
            {bundle.insights.map((insight) => (
              <li key={insight.id}>
                <p className="font-medium text-foreground">
                  {insight.title}
                  {insight.pct != null ? <span className="ml-2 text-[var(--color-accent-purple)]">{insight.pct}%</span> : null}
                </p>
                <p className="mt-1 text-xs text-muted">{insight.body}</p>
              </li>
            ))}
          </ul>
          <a href="/insights" className="mt-4 inline-flex text-xs text-[var(--color-accent-teal)] hover:underline">
            View detailed insights →
          </a>
        </GlassPanel>

        <GlassPanel className="xl:col-span-5">
          <h2 className="text-sm font-semibold">Net Worth Forecast</h2>
          <p className="mt-1 text-xs text-muted">Projected with Finlo Forecast Engine</p>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bundle.forecast.map((f) => ({ label: f.label, value: f.value }))}>
                <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area type="monotone" dataKey="value" stroke="#b4a7d6" fill="#b4a7d6" fillOpacity={0.25} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {bundle.forecast.map((f) => (
              <div key={f.years} className="rounded-lg bg-white/5 px-2 py-2 text-center">
                <p className="text-[10px] text-muted">{f.label}</p>
                <p className="text-xs font-semibold tabular-nums">{money(f.value)}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="xl:col-span-3">
          <h2 className="text-sm font-semibold">Milestones</h2>
          <ul className="mt-3 space-y-3">
            {bundle.milestones.map((m) => (
              <li key={m.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-2">
                    {m.achieved ? <CheckCircle2 className="h-4 w-4 text-[var(--color-accent-green)]" /> : <CircleDashed className="h-4 w-4 text-muted" />}
                    {m.label}
                  </span>
                  <span className="text-xs text-muted">{m.progress.toFixed(0)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--color-accent-teal)]" style={{ width: `${Math.min(100, m.progress)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>
    </Page>
  );
}

function Kpi({
  label,
  value,
  hint,
  positive,
  accent
}: {
  label: string;
  value: string;
  hint: string;
  positive?: boolean;
  accent?: 'purple';
}) {
  return (
    <GlassPanel>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold tabular-nums', accent === 'purple' && 'text-[var(--color-accent-purple)]')}>{value}</p>
      <p className={cn('mt-2 text-xs', positive === false ? 'text-red-300' : 'text-[var(--color-accent-green)]')}>{hint}</p>
    </GlassPanel>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-white/5 px-3 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function WaterfallRow({ step, currency, max }: { step: WaterfallStep; currency: string; max: number }) {
  const width = Math.max(8, (Math.abs(step.value) / Math.max(max, 1)) * 100);
  return (
    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-sm">
      <span className="text-muted">{step.label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-white/5">
        <div
          className={cn(
            'h-full rounded-full',
            step.kind === 'negative' && 'bg-[#f472b6]',
            step.kind === 'positive' && 'bg-[var(--color-accent-green)]',
            step.kind === 'total' && 'bg-[var(--color-accent-teal)]'
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="min-w-[96px] text-right tabular-nums font-medium">
        {step.kind === 'negative' ? '−' : step.kind === 'positive' ? '+' : '='} {formatCurrency(Math.abs(step.value), currency)}
      </span>
    </div>
  );
}
