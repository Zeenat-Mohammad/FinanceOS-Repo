import { supabase } from '@/data/supabase/client';
import { MarketRepository } from './MarketRepository';
import type { AssetClass, InvestmentHolding, PortfolioSummary, SparkPoint } from '@/types/insights';

const LOCAL_KEY = 'finlo.insights.holdings.';

function readLocal(householdId: string): InvestmentHolding[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY + householdId) ?? '[]') as InvestmentHolding[];
  } catch {
    return [];
  }
}

function writeLocal(householdId: string, holdings: InvestmentHolding[]) {
  localStorage.setItem(LOCAL_KEY + householdId, JSON.stringify(holdings));
}

async function accountBackedHoldings(householdId: string): Promise<InvestmentHolding[]> {
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('household_id', householdId)
    .in('type', ['investment', 'crypto'])
    .eq('is_archived', false)
    .is('deleted_at', null);
  return (data ?? []).map((account) => ({
    id: `account:${account.id}`,
    household_id: account.household_id,
    user_id: account.user_id,
    asset_class: account.type === 'crypto' ? 'crypto' : 'other_assets',
    ticker: null,
    name: account.name,
    quantity: 1,
    average_cost: Number(account.opening_balance || account.balance || 0),
    current_price: Number(account.balance || 0),
    currency: account.currency,
    logo_url: null,
    notes: 'Account-backed investment balance',
    metadata: { source: 'account', account_id: account.id },
    created_at: account.created_at,
    updated_at: account.updated_at,
    deleted_at: null
  })) as InvestmentHolding[];
}

function marketValue(h: InvestmentHolding) {
  const price = h.current_price ?? h.average_cost;
  return h.quantity * price;
}

function costBasis(h: InvestmentHolding) {
  return h.quantity * h.average_cost;
}

function buildSeries(value: number): SparkPoint[] {
  return Array.from({ length: 24 }, (_, index) => ({
    label: index === 23 ? 'Now' : `P${index + 1}`,
    value: Math.round(value)
  }));
}

export const InvestmentRepository = {
  async list(householdId: string, _userId: string, _currency = 'USD'): Promise<InvestmentHolding[]> {
    void _userId;
    void _currency;
    const { data, error } = await supabase
      .from('investment_holdings')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      // Preserve previously entered offline holdings, but never fabricate financial records.
      const local = readLocal(householdId);
      return local.length ? local : accountBackedHoldings(householdId);
    }

    if (!data?.length) {
      const accountHoldings = await accountBackedHoldings(householdId);
      return accountHoldings.length ? accountHoldings : readLocal(householdId);
    }

    const holdings = data as InvestmentHolding[];
    writeLocal(householdId, holdings);
    return holdings;
  },

  async refreshPrices(holdings: InvestmentHolding[]): Promise<InvestmentHolding[]> {
    const symbols = holdings.map((h) => h.ticker).filter((t): t is string => Boolean(t) && t !== 'CASH' && t !== 'GOLD');
    if (!symbols.length) return holdings;
    const { quotes } = await MarketRepository.getQuotes(symbols);
    const bySymbol = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));
    return holdings.map((h) => {
      if (!h.ticker) return h;
      const q = bySymbol.get(h.ticker.toUpperCase());
      if (!q) return h;
      return { ...h, current_price: q.price };
    });
  },

  summarize(holdings: InvestmentHolding[]): PortfolioSummary {
    const portfolioValue = holdings.reduce((s, h) => s + marketValue(h), 0);
    const cashInvested = holdings.reduce((s, h) => s + costBasis(h), 0);
    const totalGain = portfolioValue - cashInvested;
    const totalReturnPct = cashInvested > 0 ? (totalGain / cashInvested) * 100 : 0;
    const todayGain = holdings.reduce((s, h) => {
      const price = h.current_price ?? h.average_cost;
      const previousClose = typeof h.metadata.previous_close === 'number' ? h.metadata.previous_close : price;
      return s + h.quantity * (price - previousClose);
    }, 0);
    const oldestCreatedAt = holdings.reduce(
      (oldest, holding) => Math.min(oldest, new Date(holding.created_at).getTime()),
      Date.now()
    );
    const yearsHeld = Math.max(1 / 12, (Date.now() - oldestCreatedAt) / (365.25 * 24 * 60 * 60 * 1000));
    const annualReturnPct =
      cashInvested > 0 && portfolioValue > 0
        ? (Math.pow(portfolioValue / cashInvested, 1 / yearsHeld) - 1) * 100
        : 0;
    const dividendIncome = holdings.reduce((sum, holding) => {
      const annualDividend = typeof holding.metadata.annual_dividend_per_share === 'number'
        ? holding.metadata.annual_dividend_per_share
        : 0;
      return sum + holding.quantity * annualDividend;
    }, 0);

    const byClass = new Map<AssetClass, number>();
    for (const h of holdings) {
      byClass.set(h.asset_class, (byClass.get(h.asset_class) ?? 0) + marketValue(h));
    }
    const allocation = [...byClass.entries()].map(([assetClass, value]) => ({
      class: assetClass,
      value,
      pct: portfolioValue > 0 ? (value / portfolioValue) * 100 : 0
    }));

    return {
      portfolioValue,
      todayGain,
      totalGain,
      totalReturnPct,
      annualReturnPct,
      cashInvested,
      dividendIncome,
      allocation,
      series: buildSeries(portfolioValue)
    };
  },

  async create(
    input: Omit<InvestmentHolding, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'metadata'> & { metadata?: Record<string, unknown> }
  ): Promise<InvestmentHolding> {
    const row = {
      ...input,
      metadata: input.metadata ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };

    const { data, error } = await supabase.from('investment_holdings').insert(row).select('*').single();
    if (error) {
      const local = readLocal(input.household_id);
      const holding: InvestmentHolding = { ...row, id: crypto.randomUUID(), metadata: row.metadata };
      writeLocal(input.household_id, [...local, holding]);
      return holding;
    }
    return data as InvestmentHolding;
  },

  holdingMetrics(h: InvestmentHolding) {
    const value = marketValue(h);
    const cost = costBasis(h);
    const gain = value - cost;
    const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
    return { value, cost, gain, gainPct };
  }
};
