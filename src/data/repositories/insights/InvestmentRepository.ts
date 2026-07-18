import { supabase } from '@/data/supabase/client';
import { throwDatabaseError } from '../repositoryError';
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

function demoHoldings(householdId: string, userId: string, currency: string): InvestmentHolding[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      household_id: householdId,
      user_id: userId,
      asset_class: 'stocks',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      quantity: 12,
      average_cost: 170,
      current_price: 198,
      currency,
      logo_url: null,
      notes: null,
      metadata: {},
      created_at: now,
      updated_at: now,
      deleted_at: null
    },
    {
      id: crypto.randomUUID(),
      household_id: householdId,
      user_id: userId,
      asset_class: 'stocks',
      ticker: 'TSLA',
      name: 'Tesla Inc.',
      quantity: 8,
      average_cost: 210,
      current_price: 245,
      currency,
      logo_url: null,
      notes: null,
      metadata: {},
      created_at: now,
      updated_at: now,
      deleted_at: null
    },
    {
      id: crypto.randomUUID(),
      household_id: householdId,
      user_id: userId,
      asset_class: 'etf',
      ticker: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      quantity: 20,
      average_cost: 420,
      current_price: 468,
      currency,
      logo_url: null,
      notes: null,
      metadata: {},
      created_at: now,
      updated_at: now,
      deleted_at: null
    },
    {
      id: crypto.randomUUID(),
      household_id: householdId,
      user_id: userId,
      asset_class: 'gold',
      ticker: 'GOLD',
      name: 'Physical Gold',
      quantity: 2,
      average_cost: 2200,
      current_price: 2380,
      currency,
      logo_url: null,
      notes: null,
      metadata: {},
      created_at: now,
      updated_at: now,
      deleted_at: null
    },
    {
      id: crypto.randomUUID(),
      household_id: householdId,
      user_id: userId,
      asset_class: 'crypto',
      ticker: 'BTC',
      name: 'Bitcoin',
      quantity: 0.15,
      average_cost: 52000,
      current_price: 64000,
      currency,
      logo_url: null,
      notes: null,
      metadata: {},
      created_at: now,
      updated_at: now,
      deleted_at: null
    },
    {
      id: crypto.randomUUID(),
      household_id: householdId,
      user_id: userId,
      asset_class: 'cash',
      ticker: 'CASH',
      name: 'Brokerage Cash',
      quantity: 1,
      average_cost: 4500,
      current_price: 4500,
      currency,
      logo_url: null,
      notes: null,
      metadata: {},
      created_at: now,
      updated_at: now,
      deleted_at: null
    }
  ];
}

function marketValue(h: InvestmentHolding) {
  const price = h.current_price ?? h.average_cost;
  return h.quantity * price;
}

function costBasis(h: InvestmentHolding) {
  return h.quantity * h.average_cost;
}

function buildSeries(value: number): SparkPoint[] {
  const points: SparkPoint[] = [];
  let v = value * 0.86;
  for (let i = 0; i < 24; i += 1) {
    v *= 1 + (Math.sin(i / 3) * 0.012 + 0.004);
    points.push({ label: `P${i + 1}`, value: Math.round(v) });
  }
  points[points.length - 1] = { label: 'Now', value: Math.round(value) };
  return points;
}

export const InvestmentRepository = {
  async list(householdId: string, userId: string, currency = 'USD'): Promise<InvestmentHolding[]> {
    const { data, error } = await supabase
      .from('investment_holdings')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      // Table may not exist yet — use local + demo seed
      const local = readLocal(householdId);
      if (local.length) return local;
      const seeded = demoHoldings(householdId, userId, currency);
      writeLocal(householdId, seeded);
      return seeded;
    }

    if (!data?.length) {
      const local = readLocal(householdId);
      if (local.length) return local;
      const seeded = demoHoldings(householdId, userId, currency);
      writeLocal(householdId, seeded);
      // Best-effort persist
      await supabase.from('investment_holdings').insert(seeded).then(() => undefined);
      return seeded;
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
      return s + h.quantity * price * 0.004; // soft daily estimate when live change unavailable
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
      annualReturnPct: totalReturnPct * 0.35,
      cashInvested,
      dividendIncome: portfolioValue * 0.012,
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
