export type AssetClass =
  | 'stocks'
  | 'etf'
  | 'mutual_funds'
  | 'bonds'
  | 'gold'
  | 'silver'
  | 'crypto'
  | 'cash'
  | 'property'
  | 'real_estate'
  | 'vehicle'
  | 'other_assets';

export type InvestmentHolding = {
  id: string;
  household_id: string;
  user_id: string;
  asset_class: AssetClass;
  ticker: string | null;
  name: string;
  quantity: number;
  average_cost: number;
  current_price: number | null;
  currency: string;
  logo_url: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SparkPoint = { label: string; value: number };

export type IndicatorCard = {
  id: string;
  label: string;
  value: number | string;
  previous: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'flat';
  changeLabel: string;
  sparkline: SparkPoint[];
};

export type EconomySnapshot = {
  country: string;
  currency: string;
  updatedAt: string;
  source: 'live' | 'curated';
  indicators: IndicatorCard[];
  inflationSeries: SparkPoint[];
  inflationCurrent: number;
  inflationAverage5y: number;
  inflationForecast: number;
  inflationImpactNote: string;
  interest: {
    centralBank: number;
    savings: number;
    mortgage: number;
    personalLoan: number;
    creditCard: number;
  };
  commodities: {
    gold: number;
    silver: number;
    oil: number;
    fuel: number;
  };
};

export type NewsArticle = {
  id: string;
  category: 'economy' | 'markets' | 'stocks' | 'crypto' | 'government' | 'personal_finance' | 'holdings';
  title: string;
  summary: string;
  url: string;
  image?: string | null;
  source: string;
  publishedAt: string;
  tickers?: string[];
};

export type TaxCenterContent = {
  country: string;
  title: string;
  topics: Array<{ id: string; label: string; blurb: string }>;
  deadlines: Array<{ id: string; title: string; date: string; severity: 'info' | 'warn' | 'critical' }>;
  news: NewsArticle[];
  suggestions: string[];
};

export type PortfolioSummary = {
  portfolioValue: number;
  todayGain: number;
  totalGain: number;
  totalReturnPct: number;
  annualReturnPct: number;
  cashInvested: number;
  dividendIncome: number;
  allocation: Array<{ class: AssetClass; value: number; pct: number }>;
  series: SparkPoint[];
};

export type OcrReceiptResult = {
  merchant: string | null;
  invoice_number: string | null;
  amount: number | null;
  tax_amount: number | null;
  currency: string | null;
  date: string | null;
  items: string[];
  payment_method: string | null;
  confidence: number;
  ocr_text: string;
  image_url?: string;
  storage_path?: string;
};

export type ReceiptImageRecord = {
  id: string;
  household_id: string;
  user_id: string;
  transaction_id: string | null;
  image_url: string;
  storage_path: string | null;
  ocr_text: string | null;
  merchant: string | null;
  invoice_number: string | null;
  tax_amount: number | null;
  amount: number | null;
  currency: string | null;
  receipt_date: string | null;
  payment_method: string | null;
  items: unknown;
  confidence: number | null;
  created_at: string;
};

export type AiInsightCard = {
  id: string;
  severity: 'info' | 'positive' | 'warning' | 'critical';
  title: string;
  explanation: string;
  suggestion: string;
  tags: string[];
};

export type InsightsBundle = {
  country: string;
  currency: string;
  economy: EconomySnapshot;
  tax: TaxCenterContent;
  news: NewsArticle[];
  personalizedNews: NewsArticle[];
  portfolio: PortfolioSummary;
  holdings: InvestmentHolding[];
  aiInsights: AiInsightCard[];
};
