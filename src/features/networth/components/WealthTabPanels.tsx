import { useMemo } from 'react';
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
import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/core/utils/currency';
import { GlassPanel } from '@/features/insights/components/CountrySummary';
import { MarketIntelligencePanel } from '@/features/insights/components/MarketIntelligencePanel';
import { InvestmentRepository } from '@/data/repositories/insights/InvestmentRepository';
import type { InvestmentHolding, PortfolioSummary } from '@/types/insights';
import type { NetWorthBundle } from '@/types/wealth';
import type {
  AssetRecord,
  CreditCardRecord,
  CryptoAssetRecord,
  InvestmentRecord,
  LoanRecord,
  WealthDashboardSummary
} from '@/types/wealth';
import { cn } from '@/core/utils/cn';
import { WealthDataTable, cnPositive, formatPct } from './WealthDataTable';

const COLORS = ['#3a9d9d', '#b6d7a8', '#b4a7d6', '#474f7a', '#f59e0b', '#60a5fa', '#f472b6', '#94a3b8'];

const INVESTMENT_GROUPS: Array<{ label: string; types: InvestmentRecord['investment_type'][] }> = [
  { label: 'Stocks', types: ['stocks'] },
  { label: 'ETF', types: ['etf'] },
  { label: 'Mutual Funds', types: ['mutual_funds'] },
  { label: 'Crypto Investments', types: ['crypto'] },
  { label: 'Gold', types: ['gold'] },
  { label: 'Real Estate', types: ['real_estate'] },
  { label: 'Bonds', types: ['bonds'] },
  { label: 'Fixed Deposits', types: ['fixed_deposits'] },
  { label: 'Retirement', types: ['retirement'] },
  { label: 'Cash Equivalents', types: ['cash_equivalent'] },
  { label: 'Gold ETF', types: ['gold_etf'] },
  { label: 'REIT', types: ['reit'] },
  { label: 'Other', types: ['other'] }
];

const ASSET_GROUPS: Array<{ label: string; types: AssetRecord['asset_type'][] }> = [
  { label: 'Property', types: ['property'] },
  { label: 'Vehicle', types: ['vehicle'] },
  { label: 'Gold', types: ['gold'] },
  { label: 'Silver', types: ['silver'] },
  { label: 'Jewelry', types: ['jewelry'] },
  { label: 'Business', types: ['business'] },
  { label: 'Cash Assets', types: ['cash'] },
  { label: 'Other Assets', types: ['other', 'collectibles', 'electronics'] }
];

const LOAN_GROUPS: Array<{ label: string; types: LoanRecord['loan_type'][] }> = [
  { label: 'Mortgage', types: ['home'] },
  { label: 'Education', types: ['education'] },
  { label: 'Vehicle', types: ['vehicle'] },
  { label: 'Personal', types: ['personal'] },
  { label: 'Business', types: ['business'] }
];

export function OverviewTab({
  bundle,
  portfolio,
  holdings,
  currency
}: {
  bundle: NetWorthBundle;
  portfolio: PortfolioSummary;
  holdings: InvestmentHolding[];
  currency: string;
}) {
  const o = bundle.overview;
  const money = (n: number) => formatCurrency(n, currency);
  const sectorAllocation = useMemo(
    () =>
      Object.entries(
        holdings.reduce<Record<string, number>>((map, holding) => {
          const sector = typeof holding.metadata.sector === 'string' ? holding.metadata.sector : holding.asset_class.replaceAll('_', ' ');
          map[sector] = (map[sector] ?? 0) + InvestmentRepository.holdingMetrics(holding).value;
          return map;
        }, {})
      ).map(([name, value]) => ({ name, value })),
    [holdings]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GlassPanel>
          <p className="text-xs uppercase tracking-wide text-muted">Portfolio Summary</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{money(portfolio.portfolioValue)}</p>
          <p className="mt-1 text-xs text-muted">{holdings.length} holdings · {portfolio.totalReturnPct.toFixed(1)}% return</p>
        </GlassPanel>
        <GlassPanel>
          <p className="text-xs uppercase tracking-wide text-muted">Net Worth</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{money(o.currentNetWorth)}</p>
          <p className={cn('mt-1 inline-flex items-center gap-1 text-xs', o.delta >= 0 ? 'text-[var(--color-accent-green)]' : 'text-red-300')}>
            {o.delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {o.deltaPct >= 0 ? '+' : ''}{o.deltaPct.toFixed(1)}% this period
          </p>
        </GlassPanel>
        <GlassPanel>
          <p className="text-xs uppercase tracking-wide text-muted">Allocation</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{money(o.totalAssets)}</p>
          <p className="mt-1 text-xs text-muted">Assets · {money(o.totalLiabilities)} liabilities</p>
        </GlassPanel>
        <GlassPanel>
          <p className="text-xs uppercase tracking-wide text-muted">Performance</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{money(portfolio.totalGain)}</p>
          <p className="mt-1 text-xs text-muted">{portfolio.annualReturnPct.toFixed(1)}% annualized</p>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-7">
          <h3 className="text-sm font-semibold">Performance</h3>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolio.series}>
                <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} width={56} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area type="monotone" dataKey="value" stroke="#b4a7d6" fill="#b4a7d6" fillOpacity={0.25} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
        <GlassPanel className="xl:col-span-5">
          <h3 className="text-sm font-semibold">Allocation</h3>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sectorAllocation.length ? sectorAllocation : bundle.distribution} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84}>
                  {(sectorAllocation.length ? sectorAllocation : bundle.distribution).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel>
        <h3 className="text-sm font-semibold">Recent Activity</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2 text-left">Month</th>
                <th className="px-2 py-2 text-left">Net Worth</th>
                <th className="px-2 py-2 text-left">Growth</th>
                <th className="px-2 py-2 text-left">Investment Gain</th>
              </tr>
            </thead>
            <tbody>
              {bundle.table.slice(-6).reverse().map((row) => (
                <tr key={row.month} className="border-t border-border/30">
                  <td className="px-2 py-2">{row.label}</td>
                  <td className="px-2 py-2 tabular-nums">{money(row.netWorth)}</td>
                  <td className={cn('px-2 py-2 tabular-nums', row.growthPct >= 0 ? 'text-[var(--color-accent-green)]' : 'text-red-300')}>
                    {formatPct(row.growthPct)}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{money(row.investmentGain)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}

export function InvestmentsTab({ investments, currency }: { investments: InvestmentRecord[]; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency);
  return (
    <div className="space-y-4">
      {INVESTMENT_GROUPS.map((group) => {
        const rows = investments.filter((row) => group.types.includes(row.investment_type));
        return (
          <WealthDataTable
            key={group.label}
            title={group.label}
            rows={rows}
            totalValue={money(rows.reduce((s, r) => s + r.quantity * r.current_price, 0))}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'ticker', label: 'Ticker' },
              { key: 'quantity', label: 'Qty' },
              { key: 'current_price', label: 'Price', render: (row) => money(row.current_price) },
              { key: 'value', label: 'Value', render: (row) => money(row.quantity * row.current_price) }
            ]}
            defaultOpen={rows.length > 0}
          />
        );
      })}
    </div>
  );
}

export function AssetsTab({ assets, currency }: { assets: AssetRecord[]; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency);
  return (
    <div className="space-y-4">
      {ASSET_GROUPS.map((group) => {
        const rows = assets.filter((row) => group.types.includes(row.asset_type));
        return (
          <WealthDataTable
            key={group.label}
            title={group.label}
            rows={rows}
            totalValue={money(rows.reduce((s, r) => s + r.estimated_value, 0))}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'asset_type', label: 'Type' },
              { key: 'estimated_value', label: 'Value', render: (row) => money(row.estimated_value) }
            ]}
            defaultOpen={rows.length > 0}
          />
        );
      })}
    </div>
  );
}

export function CryptoTab({ crypto, currency }: { crypto: CryptoAssetRecord[]; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency);
  const allocation = crypto.map((row) => ({ name: row.ticker, value: row.quantity * row.current_price }));
  const total = allocation.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel>
          <h3 className="text-sm font-semibold">Allocation</h3>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78}>
                  {allocation.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
        <GlassPanel>
          <h3 className="text-sm font-semibold">Performance</h3>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{money(total)}</p>
          <p className="mt-1 text-xs text-muted">{crypto.length} coins tracked</p>
        </GlassPanel>
      </div>
      <WealthDataTable
        title="Coins"
        rows={crypto}
        totalValue={money(total)}
        columns={[
          { key: 'coin_name', label: 'Coin' },
          { key: 'ticker', label: 'Ticker' },
          { key: 'wallet', label: 'Wallet', render: (row) => row.wallet ?? row.exchange ?? '—' },
          { key: 'quantity', label: 'Qty' },
          {
            key: 'gain',
            label: 'Gain/Loss',
            render: (row) => {
              const cost = row.quantity * row.purchase_price;
              const value = row.quantity * row.current_price;
              const pct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
              return <span className={cnPositive(value - cost)}>{formatPct(pct)}</span>;
            }
          },
          { key: 'value', label: 'Value', render: (row) => money(row.quantity * row.current_price) }
        ]}
      />
    </div>
  );
}

export function CreditCardsTab({ cards, currency }: { cards: CreditCardRecord[]; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency);
  return (
    <WealthDataTable
      title="Credit Cards"
      rows={cards}
      totalValue={money(cards.reduce((s, r) => s + r.outstanding_balance, 0))}
      columns={[
        { key: 'card_name', label: 'Card' },
        { key: 'outstanding_balance', label: 'Outstanding', render: (row) => money(row.outstanding_balance) },
        { key: 'credit_limit', label: 'Limit', render: (row) => money(row.credit_limit) },
        { key: 'apr_pct', label: 'APR', render: (row) => `${row.apr_pct}%` },
        {
          key: 'utilization',
          label: 'Utilization',
          render: (row) => `${row.credit_limit > 0 ? ((row.outstanding_balance / row.credit_limit) * 100).toFixed(0) : 0}%`
        },
        { key: 'due_date', label: 'Due Date', render: (row) => row.due_date ?? '—' }
      ]}
    />
  );
}

export function LoansTab({ loans, currency }: { loans: LoanRecord[]; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency);
  return (
    <div className="space-y-4">
      {LOAN_GROUPS.map((group) => {
        const rows = loans.filter((row) => group.types.includes(row.loan_type));
        return (
          <WealthDataTable
            key={group.label}
            title={group.label}
            rows={rows}
            totalValue={money(rows.reduce((s, r) => s + r.remaining_balance, 0))}
            columns={[
              { key: 'name', label: 'Loan' },
              { key: 'remaining_balance', label: 'Remaining', render: (row) => money(row.remaining_balance) },
              { key: 'monthly_emi', label: 'EMI', render: (row) => money(row.monthly_emi) },
              { key: 'interest_rate_pct', label: 'Interest', render: (row) => `${row.interest_rate_pct}%` },
              { key: 'maturity_date', label: 'Payoff', render: (row) => row.maturity_date ?? '—' }
            ]}
            defaultOpen={rows.length > 0}
          />
        );
      })}
    </div>
  );
}

export function NetWorthTab({ bundle, currency }: { bundle: NetWorthBundle; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-7">
          <h3 className="text-sm font-semibold">Timeline</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bundle.trend}>
                <CartesianGrid stroke="rgba(180,167,214,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area type="monotone" dataKey="netWorth" stroke="#3a9d9d" fill="#3a9d9d" fillOpacity={0.25} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
        <GlassPanel className="xl:col-span-5">
          <h3 className="text-sm font-semibold">Assets vs Liabilities</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bundle.trend}>
                <CartesianGrid stroke="rgba(180,167,214,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="assets" fill="#b6d7a8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="liabilities" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel>
        <h3 className="text-sm font-semibold">Growth</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2 text-left">Month</th>
                <th className="px-2 py-2 text-left">Net Worth</th>
                <th className="px-2 py-2 text-left">Assets</th>
                <th className="px-2 py-2 text-left">Liabilities</th>
                <th className="px-2 py-2 text-left">Growth</th>
              </tr>
            </thead>
            <tbody>
              {bundle.table.map((row) => (
                <tr key={row.month} className="border-t border-border/30">
                  <td className="px-2 py-2">{row.label}</td>
                  <td className="px-2 py-2 tabular-nums">{money(row.netWorth)}</td>
                  <td className="px-2 py-2 tabular-nums">{money(row.assets)}</td>
                  <td className="px-2 py-2 tabular-nums">{money(row.liabilities)}</td>
                  <td className={cn('px-2 py-2 tabular-nums', row.growthPct >= 0 ? 'text-[var(--color-accent-green)]' : 'text-red-300')}>
                    {formatPct(row.growthPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-accent-purple)]" />
          <h3 className="text-sm font-semibold">Forecast</h3>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bundle.forecast.map((f) => ({ label: f.label, value: f.value }))}>
              <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} width={56} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Area type="monotone" dataKey="value" stroke="#b4a7d6" fill="#b4a7d6" fillOpacity={0.25} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    </div>
  );
}

export function MarketTab({
  householdId,
  holdings,
  portfolio
}: {
  householdId: string;
  holdings: InvestmentHolding[];
  portfolio: PortfolioSummary;
}) {
  return (
    <div className="space-y-4">
      <MarketIntelligencePanel householdId={householdId} holdings={holdings} portfolio={portfolio} age={undefined} />
      <GlassPanel className="text-sm text-muted">
        Latest headlines and AI market commentary live on{' '}
        <a href="/insights" className="text-accent hover:underline">
          Financial News & AI
        </a>
        .
      </GlassPanel>
    </div>
  );
}

export function resolveWealthTab(tab: string | null): import('./WealthTabBar').WealthTabId {
  const allowed = new Set(['overview', 'investments', 'assets', 'crypto', 'credit-cards', 'loans', 'net-worth', 'market']);
  if (tab && allowed.has(tab)) return tab as import('./WealthTabBar').WealthTabId;
  return 'overview';
}

export type { WealthDashboardSummary };
