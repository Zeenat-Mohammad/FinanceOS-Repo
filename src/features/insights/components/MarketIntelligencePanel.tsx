import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Gauge, Sparkles } from 'lucide-react';
import { AccountsRepository, GoalsRepository } from '@/data/repositories';
import { MarketRepository } from '@/data/repositories/insights/MarketRepository';
import { queryKeys } from '@/data/query-keys';
import type { InvestmentHolding, PortfolioSummary } from '@/types/insights';
import { cn } from '@/core/utils/cn';
import { GlassPanel, InsightsSection } from './CountrySummary';

export function MarketIntelligencePanel({
  householdId,
  holdings,
  portfolio,
  age
}: {
  householdId: string;
  holdings: InvestmentHolding[];
  portfolio: PortfolioSummary;
  age?: number | null;
}) {
  const market = useQuery({
    queryKey: ['market', 'overview'],
    queryFn: MarketRepository.getOverview,
    staleTime: 15 * 60_000
  });
  const accounts = useQuery({ queryKey: queryKeys.accounts.all, queryFn: AccountsRepository.list });
  const goals = useQuery({
    queryKey: queryKeys.goals.bundle(householdId),
    queryFn: () => GoalsRepository.getBundle(householdId),
    retry: false
  });
  const suggestions = useMemo(() => {
    const cashAccounts = (accounts.data ?? [])
      .filter((account) => account.household_id === householdId && ['bank', 'cash', 'wallet'].includes(account.group_name))
      .reduce((sum, account) => sum + Math.max(0, account.balance), 0);
    return buildSuggestions({ holdings, portfolio, cashAvailable: cashAccounts, age, goalCount: goals.data?.kpis.totalGoals ?? 0 });
  }, [accounts.data, age, goals.data?.kpis.totalGoals, holdings, householdId, portfolio]);

  const overview = market.data;
  const quotes = [...(overview?.indices ?? []), ...(overview?.commodities ?? []), ...(overview?.crypto ?? [])];

  return (
    <>
      <InsightsSection id="market-overview" title="Current Market Overview" subtitle={`Live provider cache refreshes every 15 minutes${overview ? ` · ${overview.source}` : ''}.`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quotes.map((quote) => (
            <GlassPanel key={quote.symbol}>
              <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wide text-muted">{quote.symbol}</p><h3 className="mt-1 text-sm font-semibold text-foreground">{quote.name ?? quote.symbol}</h3></div>{quote.changePercent >= 0 ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}</div>
              <div className="mt-3 text-lg font-semibold tabular-nums text-foreground">{quote.price ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Unavailable'}</div>
              <div className={cn('mt-1 text-xs tabular-nums', quote.changePercent > 0 ? 'text-success' : quote.changePercent < 0 ? 'text-destructive' : 'text-muted')}>{quote.changePercent > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%</div>
            </GlassPanel>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <Ranked title="Top gainers" rows={overview?.topGainers ?? []} />
          <Ranked title="Top losers" rows={overview?.topLosers ?? []} />
          <Ranked title="Trending sectors" rows={overview?.trendingSectors ?? []} />
          <GlassPanel><div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold">Fear & Greed</h3></div><div className="mt-4 text-3xl font-semibold text-foreground">{overview?.fearGreed?.value ?? '—'}</div><div className="mt-1 text-xs text-muted">{overview?.fearGreed?.label ?? 'Provider unavailable'}</div><div className="mt-3 text-[10px] text-muted">{overview?.fearGreed?.source ?? 'Crypto index when available'}</div></GlassPanel>
        </div>
      </InsightsSection>

      <InsightsSection id="opportunities" title="Investment Opportunities" subtitle="Educational, rule-based suggestions using holdings, liquidity, goals, inferred risk and available profile context.">
        <div className="grid gap-3 lg:grid-cols-2">
          {suggestions.map((suggestion) => (
            <GlassPanel key={suggestion.title}>
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-purple/15 text-purple"><Sparkles className="h-4 w-4" /></span><div><div className="text-[10px] font-semibold uppercase tracking-wide text-accent">{suggestion.window}</div><h3 className="mt-1 font-semibold text-foreground">{suggestion.title}</h3><p className="mt-2 text-xs text-muted">{suggestion.why}</p></div></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><Tag label="Risk" value={suggestion.risk} /><Tag label="Illustrative return" value={suggestion.expectedReturn} /><Tag label="Time horizon" value={suggestion.horizon} /></div>
            </GlassPanel>
          ))}
        </div>
        <div className="mt-4 rounded-brand border border-purple/30 bg-purple/10 p-3 text-xs text-muted"><strong className="text-foreground">Disclaimer:</strong> These suggestions are educational scenarios, not personalized investment advice. Returns are illustrative ranges, never guaranteed. Consider fees, taxes, liquidity, suitability and professional advice.</div>
      </InsightsSection>
    </>
  );
}

function Ranked({ title, rows }: { title: string; rows: Array<{ symbol: string; name?: string; changePercent: number }> }) {
  return <GlassPanel><h3 className="text-sm font-semibold text-foreground">{title}</h3><div className="mt-3 space-y-2">{rows.length ? rows.map((row) => <div key={row.symbol} className="flex justify-between gap-2 text-xs"><span className="truncate text-muted">{row.name ?? row.symbol}</span><span className={row.changePercent >= 0 ? 'text-success' : 'text-destructive'}>{row.changePercent > 0 ? '+' : ''}{row.changePercent.toFixed(2)}%</span></div>) : <p className="text-xs text-muted">Live ranking unavailable.</p>}</div></GlassPanel>;
}

function Tag({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-primary/25 p-2"><div className="text-[10px] text-muted">{label}</div><div className="mt-1 font-medium text-foreground">{value}</div></div>;
}

function buildSuggestions(input: {
  holdings: InvestmentHolding[];
  portfolio: PortfolioSummary;
  cashAvailable: number;
  age?: number | null;
  goalCount: number;
}) {
  const largest = input.portfolio.allocation.reduce((best, item) => (item.pct > (best?.pct ?? 0) ? item : best), input.portfolio.allocation[0]);
  const cashPct = input.portfolio.allocation.find((item) => item.class === 'cash')?.pct ?? 0;
  const cryptoPct = input.portfolio.allocation.find((item) => item.class === 'crypto')?.pct ?? 0;
  const ageContext = input.age ? `At age ${input.age}, preserve a horizon and risk level aligned with your goals.` : 'Add age and risk preferences to your profile for more precise horizon context.';
  const suggestions = [
    {
      window: 'This month',
      title: input.cashAvailable > 0 ? 'Direct only planned surplus cash' : 'Build investable liquidity first',
      why: `${input.cashAvailable > 0 ? 'Available positive cash balances can be assigned after emergency reserves and near-term goals are protected.' : 'No positive liquid surplus was detected, so avoid forcing an investment contribution.'} ${input.goalCount} active goal${input.goalCount === 1 ? '' : 's'} detected.`,
      risk: 'Low–Medium',
      expectedReturn: 'Not applicable / 3–7%',
      horizon: '1–5+ years'
    },
    {
      window: 'This quarter',
      title: largest && largest.pct > 35 ? `Review ${largest.class.replaceAll('_', ' ')} concentration` : 'Maintain broad diversification',
      why: largest && largest.pct > 35 ? `The largest asset class is ${largest.pct.toFixed(0)}% of the portfolio. Consider whether this concentration matches your documented risk capacity.` : 'No asset class exceeds the basic 35% concentration review threshold in the tracked portfolio.',
      risk: 'Medium',
      expectedReturn: 'Portfolio-dependent',
      horizon: '5+ years'
    }
  ];
  if (cryptoPct > 10) suggestions.push({ window: 'This quarter', title: 'Stress-test crypto exposure', why: `Crypto is ${cryptoPct.toFixed(0)}% of tracked investments. Model a severe drawdown before adding exposure. ${ageContext}`, risk: 'High', expectedReturn: 'Highly uncertain', horizon: '5–10+ years' });
  else if (cashPct > 20) suggestions.push({ window: 'This quarter', title: 'Review excess portfolio cash', why: `Tracked portfolio cash is ${cashPct.toFixed(0)}%. Keep near-term needs liquid, then assess gradual diversified deployment. ${ageContext}`, risk: 'Low–Medium', expectedReturn: '3–8% illustrative', horizon: '3–10+ years' });
  else suggestions.push({ window: 'This quarter', title: 'Rebalance using new contributions', why: `Use future contributions to move toward target allocations while reducing unnecessary turnover. ${ageContext}`, risk: 'Medium', expectedReturn: 'Allocation-dependent', horizon: '5–10+ years' });
  return suggestions;
}

