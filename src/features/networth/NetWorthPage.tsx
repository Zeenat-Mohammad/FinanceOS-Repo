import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { WalletCards } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { LoadingState, Page } from '@/shared/components';
import { formatCurrency } from '@/core/utils/currency';
import { queryKeys } from '@/data/query-keys';
import { NetWorthRepository } from '@/data/repositories/NetWorthRepository';
import { InvestmentRepository } from '@/data/repositories/insights/InvestmentRepository';
import { useForecast, DEFAULT_ASSUMPTIONS } from '@/features/forecast/useForecast';
import { GlassPanel } from '@/features/insights/components/CountrySummary';
import { useWealthSummary } from '@/features/networth/useWealth';
import { WealthTabBar, type WealthTabId } from './components/WealthTabBar';
import {
  AssetsTab,
  CreditCardsTab,
  CryptoTab,
  InvestmentsTab,
  LoansTab,
  MarketTab,
  NetWorthTab,
  OverviewTab,
  resolveWealthTab
} from './components/WealthTabPanels';

export default function NetWorthPage() {
  const { user, profile, household } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveWealthTab(searchParams.get('tab'));
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';

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
      }),
    staleTime: 60_000
  });

  const holdingsQuery = useQuery({
    queryKey: queryKeys.insights.holdings(household?.id ?? 'none'),
    enabled: Boolean(query.data && household?.id && user?.id),
    queryFn: () => InvestmentRepository.list(household!.id, user!.id, currency),
    staleTime: 60_000
  });

  const wealthQuery = useWealthSummary(household?.id);

  function setTab(tab: WealthTabId) {
    setSearchParams(tab === 'overview' ? {} : { tab });
  }

  if (!household || !user) return <LoadingState label="Loading Wealth Center" />;
  if (query.isLoading || !query.data) return <LoadingState label="Calculating your wealth" />;

  const bundle = query.data;
  const holdings = holdingsQuery.data ?? [];
  const portfolio = InvestmentRepository.summarize(holdings);
  const wealth = wealthQuery.data ?? { investments: [], assets: [], crypto: [], loans: [], credit_cards: [], monthly_budgets: [] };
  const money = (n: number) => formatCurrency(n, currency);

  return (
    <Page className="space-y-8 pb-16">
      <header className="card-shell relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(58,157,157,0.25),transparent_42%),radial-gradient(circle_at_left,rgba(180,167,214,0.16),transparent_40%)]" />
        <div className="relative flex flex-col gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-white/5 px-3 py-1 text-xs text-muted">
              <WalletCards className="h-3.5 w-3.5 text-[var(--color-accent-teal)]" />
              Wealth Management Center
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-card-foreground)] sm:text-4xl">
              Investments & Net Worth
            </h1>
            <p className="mt-2 text-sm text-[var(--color-card-muted)]">
              Portfolio, assets, crypto, liabilities, net worth timeline, and live market context — one desk for {currency}.
            </p>
          </div>
          <WealthTabBar activeTab={activeTab} onChange={setTab} />
        </div>
      </header>

      {activeTab === 'overview' ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Kpi label="Portfolio" value={money(portfolio.portfolioValue)} hint={`${holdings.length} holdings`} />
          <Kpi label="Net worth" value={money(bundle.overview.currentNetWorth)} hint={`${bundle.overview.deltaPct >= 0 ? '+' : ''}${bundle.overview.deltaPct.toFixed(1)}% period`} />
          <Kpi label="Cash" value={money(bundle.assets.find((a) => a.category === 'cash')?.value ?? 0)} hint="Liquid" />
          <Kpi label="Debt" value={money(bundle.overview.totalLiabilities)} hint="Loans & cards" />
          <Kpi label="Assets" value={money(bundle.overview.totalAssets)} hint="All categories" />
          <Kpi label="Investments" value={money(wealth.investments.reduce((s, r) => s + r.quantity * r.current_price, 0))} hint={`${wealth.investments.length} records`} />
        </section>
      ) : null}

      {activeTab === 'overview' ? <OverviewTab bundle={bundle} portfolio={portfolio} holdings={holdings} currency={currency} /> : null}
      {activeTab === 'investments' ? <InvestmentsTab investments={wealth.investments} currency={currency} /> : null}
      {activeTab === 'assets' ? <AssetsTab assets={wealth.assets} currency={currency} /> : null}
      {activeTab === 'crypto' ? <CryptoTab crypto={wealth.crypto} currency={currency} /> : null}
      {activeTab === 'credit-cards' ? <CreditCardsTab cards={wealth.credit_cards} currency={currency} /> : null}
      {activeTab === 'loans' ? <LoansTab loans={wealth.loans} currency={currency} /> : null}
      {activeTab === 'net-worth' ? <NetWorthTab bundle={bundle} currency={currency} /> : null}
      {activeTab === 'market' ? <MarketTab householdId={household.id} holdings={holdings} portfolio={portfolio} /> : null}
    </Page>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <GlassPanel>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </GlassPanel>
  );
}
