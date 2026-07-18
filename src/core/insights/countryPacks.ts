import type { EconomySnapshot, IndicatorCard, SparkPoint, TaxCenterContent, NewsArticle } from '@/types/insights';

function spark(seed: number, base: number, noise = 0.08): SparkPoint[] {
  const points: SparkPoint[] = [];
  let v = base;
  for (let i = 11; i >= 0; i -= 1) {
    v = v * (1 + Math.sin(seed + i) * noise * 0.15);
    points.push({ label: `M-${i}`, value: Number(v.toFixed(2)) });
  }
  return points;
}

function card(
  id: string,
  label: string,
  value: number,
  previous: number,
  unit: string,
  sparkline: SparkPoint[]
): IndicatorCard {
  const diff = value - previous;
  const trend = Math.abs(diff) < 0.01 ? 'flat' : diff > 0 ? 'up' : 'down';
  const changeLabel = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}${unit === '%' ? ' pts' : ''}`;
  return { id, label, value, previous, unit, trend, changeLabel, sparkline };
}

type CountryPack = {
  currency: string;
  inflation: number;
  inflationPrev: number;
  interest: number;
  interestPrev: number;
  gdp: number;
  gdpPrev: number;
  unemployment: number;
  unemploymentPrev: number;
  fuel: number;
  fuelPrev: number;
  gold: number;
  goldPrev: number;
  indexName: string;
  index: number;
  indexPrev: number;
  fx: number;
  fxPrev: number;
  inflationSeries: number[];
  rates: EconomySnapshot['interest'];
  commodities: EconomySnapshot['commodities'];
  tax: Omit<TaxCenterContent, 'country' | 'news'>;
  news: Array<Omit<NewsArticle, 'id'>>;
};

const PACKS: Record<string, CountryPack> = {
  IN: {
    currency: 'INR',
    inflation: 5.1,
    inflationPrev: 4.9,
    interest: 6.5,
    interestPrev: 6.5,
    gdp: 6.8,
    gdpPrev: 7.0,
    unemployment: 6.5,
    unemploymentPrev: 6.7,
    fuel: 102.4,
    fuelPrev: 101.1,
    gold: 72500,
    goldPrev: 71200,
    indexName: 'NIFTY 50',
    index: 24850,
    indexPrev: 24610,
    fx: 83.2,
    fxPrev: 83.5,
    inflationSeries: [4.2, 4.4, 4.6, 4.8, 5.0, 5.2, 5.1, 4.9, 5.0, 5.1, 5.0, 5.1],
    rates: { centralBank: 6.5, savings: 3.5, mortgage: 8.7, personalLoan: 12.5, creditCard: 36 },
    commodities: { gold: 72500, silver: 86000, oil: 82, fuel: 102.4 },
    tax: {
      title: 'India Tax Center',
      topics: [
        { id: 'gst', label: 'GST', blurb: 'Goods & Services Tax slabs and filing cadence.' },
        { id: 'itr', label: 'Income Tax / ITR', blurb: 'Return filing windows and slab awareness.' },
        { id: '80c', label: 'Section 80C', blurb: 'ELSS, PPF, life insurance deduction planning.' },
        { id: '80d', label: 'Section 80D', blurb: 'Health insurance premium deductions.' },
        { id: 'cg', label: 'Capital Gains', blurb: 'Equity LTCG/STCG treatment refresher.' },
        { id: 'budget', label: 'Union Budget', blurb: 'Annual budget signals for households.' }
      ],
      deadlines: [
        { id: 'itr', title: 'ITR filing window', date: 'Jul 31', severity: 'warn' },
        { id: 'advance', title: 'Advance tax installment', date: 'Sep 15', severity: 'info' },
        { id: 'gst', title: 'GSTR-3B (monthly filers)', date: '20th of month', severity: 'critical' }
      ],
      suggestions: [
        'Maximise 80C before March if taxable income sits near the next slab.',
        'Track equity LTCG near the ₹1.25L exemption threshold.',
        'Keep GST invoices searchable for business-like expenses.'
      ]
    },
    news: [
      {
        category: 'government',
        title: 'RBI holds policy rate; inflation watch continues',
        summary: 'Policy stance stays focused on durable disinflation while supporting growth.',
        url: 'https://www.rbi.org.in/',
        source: 'RBI',
        publishedAt: new Date().toISOString(),
        image: null
      },
      {
        category: 'personal_finance',
        title: 'ITR reminders: organise Form 16 and capital gains statements',
        summary: 'Households should reconcile AIS before filing to reduce mismatch notices.',
        url: 'https://www.incometax.gov.in/',
        source: 'Income Tax',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        image: null
      }
    ]
  },
  US: {
    currency: 'USD',
    inflation: 3.1,
    inflationPrev: 3.2,
    interest: 5.25,
    interestPrev: 5.5,
    gdp: 2.4,
    gdpPrev: 2.1,
    unemployment: 4.1,
    unemploymentPrev: 4.0,
    fuel: 3.45,
    fuelPrev: 3.52,
    gold: 2380,
    goldPrev: 2340,
    indexName: 'S&P 500',
    index: 5450,
    indexPrev: 5410,
    fx: 1,
    fxPrev: 1,
    inflationSeries: [3.8, 3.6, 3.5, 3.4, 3.3, 3.2, 3.1, 3.2, 3.1, 3.0, 3.1, 3.1],
    rates: { centralBank: 5.25, savings: 4.4, mortgage: 6.8, personalLoan: 11.5, creditCard: 22 },
    commodities: { gold: 2380, silver: 28, oil: 78, fuel: 3.45 },
    tax: {
      title: 'US Tax Center',
      topics: [
        { id: 'irs', label: 'IRS', blurb: 'Filing seasons, refunds, and notice awareness.' },
        { id: '401k', label: '401(k)', blurb: 'Contribution limits and employer match hygiene.' },
        { id: 'ira', label: 'IRA / Roth', blurb: 'Deductible vs Roth trade-offs.' },
        { id: 'federal', label: 'Federal Tax', blurb: 'Bracket awareness and withholding checks.' },
        { id: 'cg', label: 'Capital Gains', blurb: 'Short vs long-term holding periods.' }
      ],
      deadlines: [
        { id: 'taxday', title: 'Federal tax day', date: 'Apr 15', severity: 'critical' },
        { id: 'q3', title: 'Estimated tax Q3', date: 'Sep 15', severity: 'warn' },
        { id: '401k', title: '401(k) employee deferral cutoff', date: 'Dec 31', severity: 'info' }
      ],
      suggestions: [
        'Capture employer 401(k) match before increasing taxable brokerage buys.',
        'Harvest losses carefully against wash-sale rules.',
        'Revisit W-4 if bonus income spikes withholding surprises.'
      ]
    },
    news: [
      {
        category: 'economy',
        title: 'Fed path hinges on inflation prints and labor cooling',
        summary: 'Markets price a gradual easing path if core inflation keeps easing.',
        url: 'https://www.federalreserve.gov/',
        source: 'Federal Reserve',
        publishedAt: new Date().toISOString(),
        image: null
      }
    ]
  },
  GB: {
    currency: 'GBP',
    inflation: 2.8,
    inflationPrev: 3.0,
    interest: 5.0,
    interestPrev: 5.25,
    gdp: 0.6,
    gdpPrev: 0.4,
    unemployment: 4.3,
    unemploymentPrev: 4.2,
    fuel: 1.45,
    fuelPrev: 1.48,
    gold: 1850,
    goldPrev: 1820,
    indexName: 'FTSE 100',
    index: 8200,
    indexPrev: 8150,
    fx: 1.27,
    fxPrev: 1.26,
    inflationSeries: [4.0, 3.8, 3.5, 3.2, 3.0, 2.9, 2.8, 2.9, 2.8, 2.7, 2.8, 2.8],
    rates: { centralBank: 5.0, savings: 4.2, mortgage: 5.1, personalLoan: 9.8, creditCard: 24 },
    commodities: { gold: 1850, silver: 22, oil: 78, fuel: 1.45 },
    tax: {
      title: 'UK Tax Center',
      topics: [
        { id: 'hmrc', label: 'HMRC', blurb: 'Self Assessment and PAYE checkpoints.' },
        { id: 'isa', label: 'ISA', blurb: 'Annual allowance utilisation.' },
        { id: 'pension', label: 'Pension', blurb: 'Relief and contribution planning.' },
        { id: 'cg', label: 'Capital Gains', blurb: 'Allowance and reporting triggers.' }
      ],
      deadlines: [
        { id: 'sa', title: 'Self Assessment online', date: '31 Jan', severity: 'critical' },
        { id: 'isa', title: 'ISA allowance resets', date: '6 Apr', severity: 'info' }
      ],
      suggestions: [
        'Use ISA allowance early if you invest regularly.',
        'Check pension annual allowance if near higher-rate tax.',
        'Keep CGT records for share disposals above the allowance.'
      ]
    },
    news: [
      {
        category: 'government',
        title: 'BoE rate path remains data-dependent',
        summary: 'Services inflation and wage growth remain the key watch items.',
        url: 'https://www.bankofengland.co.uk/',
        source: 'Bank of England',
        publishedAt: new Date().toISOString(),
        image: null
      }
    ]
  }
};

function packFor(country: string): CountryPack {
  const code = country.toUpperCase();
  return PACKS[code] ?? PACKS.US;
}

export function buildEconomySnapshot(country: string): EconomySnapshot {
  const pack = packFor(country);
  const inflationSeries = pack.inflationSeries.map((value, i) => ({ label: `M-${11 - i}`, value }));
  const impactDelta = Number((pack.inflation - pack.inflationPrev).toFixed(1));
  const groceryImpact = Math.round(Math.abs(impactDelta) * 1500);

  return {
    country: country.toUpperCase(),
    currency: pack.currency,
    updatedAt: new Date().toISOString(),
    source: 'curated',
    indicators: [
      card('inflation', 'Current Inflation', pack.inflation, pack.inflationPrev, '%', spark(1, pack.inflation, 0.05)),
      card('rate', 'Interest Rate', pack.interest, pack.interestPrev, '%', spark(2, pack.interest, 0.02)),
      card('fx', 'Currency', pack.fx, pack.fxPrev, '', spark(3, pack.fx, 0.01)),
      card('gdp', 'GDP Growth', pack.gdp, pack.gdpPrev, '%', spark(4, pack.gdp, 0.06)),
      card('unemp', 'Unemployment', pack.unemployment, pack.unemploymentPrev, '%', spark(5, pack.unemployment, 0.04)),
      card('fuel', 'Fuel Price', pack.fuel, pack.fuelPrev, '', spark(6, pack.fuel, 0.03)),
      card('gold', 'Gold Price', pack.gold, pack.goldPrev, '', spark(7, pack.gold, 0.04)),
      card('index', pack.indexName, pack.index, pack.indexPrev, '', spark(8, pack.index, 0.03))
    ],
    inflationSeries,
    inflationCurrent: pack.inflation,
    inflationAverage5y: Number((pack.inflationSeries.reduce((a, b) => a + b, 0) / pack.inflationSeries.length).toFixed(2)),
    inflationForecast: Number((pack.inflation * 0.98).toFixed(2)),
    inflationImpactNote:
      impactDelta === 0
        ? 'Inflation is stable versus last print — grocery pressure looks steady.'
        : `Inflation ${impactDelta > 0 ? 'increased' : 'eased'} by ${Math.abs(impactDelta)}%. Expected grocery costs may ${impactDelta > 0 ? 'rise' : 'ease'} by about ${pack.currency === 'INR' ? '₹' : pack.currency === 'GBP' ? '£' : '$'}${groceryImpact}/month for a typical household basket.`,
    interest: pack.rates,
    commodities: pack.commodities
  };
}

export function buildTaxCenter(country: string): TaxCenterContent {
  const pack = packFor(country);
  return {
    country: country.toUpperCase(),
    title: pack.tax.title,
    topics: pack.tax.topics,
    deadlines: pack.tax.deadlines,
    suggestions: pack.tax.suggestions,
    news: pack.news.map((n, i) => ({ ...n, id: `${country}-tax-${i}` }))
  };
}

export function buildCountryNews(country: string): NewsArticle[] {
  const pack = packFor(country);
  const base = pack.news.map((n, i) => ({ ...n, id: `${country}-news-${i}` }));
  return [
    ...base,
    {
      id: `${country}-mkt-1`,
      category: 'markets',
      title: `${pack.indexName} holds near recent highs as liquidity stays supportive`,
      summary: 'Risk assets track global cues while local rates remain the domestic anchor.',
      url: '#',
      source: 'Finlo Markets Desk',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      image: null
    },
    {
      id: `${country}-crypto-1`,
      category: 'crypto',
      title: 'Crypto liquidity improves; correlation with equities stays elevated',
      summary: 'Bitcoin and major alts track risk sentiment more than idiosyncratic flows.',
      url: '#',
      source: 'Finlo Crypto Desk',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      image: null,
      tickers: ['BTC', 'ETH']
    },
    {
      id: `${country}-pf-1`,
      category: 'personal_finance',
      title: 'Household cash buffers still matter while real rates stay positive',
      summary: 'Emergency funds and high-yield cash remain relevant alongside equity allocation.',
      url: '#',
      source: 'Finlo Insights',
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      image: null
    }
  ];
}

export function resolveInsightsCountry(profileCountry?: string | null, insightsCountry?: string | null) {
  return (insightsCountry || profileCountry || '').toUpperCase() || null;
}

export function defaultCurrencyForCountry(country: string) {
  return packFor(country).currency;
}
