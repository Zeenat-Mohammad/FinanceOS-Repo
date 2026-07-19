import type { Json } from '@/types/finance';

export type AssetCategoryCode =
  | 'cash'
  | 'investments'
  | 'property'
  | 'vehicles'
  | 'gold'
  | 'crypto'
  | 'emergency_fund'
  | 'business'
  | 'other';

export type LiabilityCategoryCode =
  | 'mortgage'
  | 'home_loan'
  | 'car_loan'
  | 'credit_cards'
  | 'student_loan'
  | 'personal_loan'
  | 'other';

export type NetWorthAssetLine = {
  id: string;
  category: AssetCategoryCode;
  label: string;
  value: number;
  changePct: number;
  icon: string;
};

export type NetWorthLiabilityLine = {
  id: string;
  category: LiabilityCategoryCode;
  label: string;
  subtitle?: string;
  balance: number;
  changePct: number;
};

export type NetWorthMonthRow = {
  month: string;
  label: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  growthPct: number;
  savingsRatePct: number;
  investmentGain: number;
};

export type NetWorthOverview = {
  currentNetWorth: number;
  previousNetWorth: number;
  delta: number;
  deltaPct: number;
  totalAssets: number;
  totalLiabilities: number;
  assetsChangePct: number;
  liabilitiesChangePct: number;
  annualGrowthPct: number;
  monthlyGrowthPct: number;
  highest: number;
  lowest: number;
  currency: string;
};

export type WaterfallStep = {
  id: string;
  label: string;
  value: number;
  kind: 'positive' | 'negative' | 'total';
};

export type NetWorthBundle = {
  overview: NetWorthOverview;
  trend: Array<{ label: string; netWorth: number; assets: number; liabilities: number }>;
  distribution: Array<{ name: string; value: number; pct: number }>;
  waterfall: WaterfallStep[];
  assets: NetWorthAssetLine[];
  liabilities: NetWorthLiabilityLine[];
  table: NetWorthMonthRow[];
  insights: Array<{ id: string; title: string; body: string; pct?: number }>;
  milestones: Array<{ id: string; label: string; target: number; progress: number; achieved: boolean }>;
  forecast: Array<{ years: number; label: string; value: number }>;
};

export type SavingsChallenge = {
  id: string;
  household_id: string;
  user_id: string;
  name: string;
  average_cost: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_days: number;
  expected_savings: number | null;
  start_date: string;
  end_date: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
};

export type ChallengeDay = {
  day: string;
  success: boolean;
  amount_saved: number;
  spent?: number;
  target?: number;
  saved?: number;
  status?: 'completed' | 'pending' | 'missed' | 'future';
  transaction_id?: string | null;
};

export type SavingsBundle = {
  currency: string;
  currentSavings: number;
  goalTarget: number;
  goalProgressPct: number;
  todaySavings: number;
  monthSavings: number;
  health: {
    savingsRate: number;
    emergencyFundMonths: number;
    noSpendStreak: number;
    moneySaved: number;
    challengeScore: number;
  };
  primaryChallenge: SavingsChallenge | null;
  challenges: SavingsChallenge[];
  challengeStats: Record<string, { completed: number; saved: number; pct: number }>;
  calendar: ChallengeDay[];
  randomCalendar: ChallengeDay[];
  stats: {
    currentStreak: number;
    longestStreak: number;
    moneySaved: number;
    goalDays: number;
    completionPct: number;
  };
  forecast: Array<{ label: string; days: number; amount: number }>;
  breakdown: Array<{ id: string; label: string; value: number; pct: number }>;
  heatmap: Array<{ week: number; days: Array<'green' | 'yellow' | 'red' | 'empty'> }>;
  achievements: Array<{ id: string; label: string; unlocked: boolean }>;
  aiSuggestions: Array<{ id: string; title: string; body: string }>;
};

type WealthRecord = {
  id: string;
  household_id: string;
  user_id: string;
  notes?: string | null;
  attachments: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type InvestmentRecord = WealthRecord & {
  investment_type: 'stocks' | 'etf' | 'mutual_funds' | 'bonds' | 'gold_etf' | 'reit' | 'other';
  name: string;
  ticker?: string | null;
  quantity: number;
  purchase_price: number;
  current_price: number;
  currency: string;
  sector?: string | null;
  exchange?: string | null;
  purchase_date?: string | null;
  linked_account_id?: string | null;
};

export type AssetRecord = WealthRecord & {
  asset_type: 'property' | 'vehicle' | 'cash' | 'gold' | 'silver' | 'jewelry' | 'business' | 'collectibles' | 'electronics' | 'other';
  name: string;
  estimated_value: number;
  currency: string;
  acquisition_date?: string | null;
  depreciation_pct: number;
  linked_account_id?: string | null;
};

export type CryptoAssetRecord = WealthRecord & {
  coin_name: string;
  ticker: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  currency: string;
  exchange?: string | null;
  wallet?: string | null;
  linked_account_id?: string | null;
};

export type LoanRecord = WealthRecord & {
  loan_type: 'home' | 'education' | 'personal' | 'vehicle' | 'business' | 'other';
  name: string;
  lender?: string | null;
  original_amount: number;
  remaining_balance: number;
  interest_rate_pct: number;
  monthly_emi: number;
  term_months?: number | null;
  start_date?: string | null;
  maturity_date?: string | null;
  linked_account_id?: string | null;
};

export type CreditCardRecord = WealthRecord & {
  card_name: string;
  bank?: string | null;
  credit_limit: number;
  outstanding_balance: number;
  apr_pct: number;
  due_date?: string | null;
  minimum_payment: number;
  reward_type?: string | null;
  linked_account_id?: string | null;
};

export type MonthlyBudgetRecord = {
  id: string;
  household_id: string;
  user_id: string;
  category_id?: string | null;
  category_name: string;
  budget_year: number;
  budget_month: number;
  allocated: number;
  spent: number;
  remaining: number;
  forecast: number;
  carry_forward: number;
  status: 'active' | 'archived' | 'draft';
  notes?: string | null;
  attachments: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type WealthDashboardSummary = {
  investments: InvestmentRecord[];
  assets: AssetRecord[];
  crypto: CryptoAssetRecord[];
  loans: LoanRecord[];
  credit_cards: CreditCardRecord[];
  monthly_budgets: MonthlyBudgetRecord[];
};

export type WealthKpis = {
  portfolioValue: number;
  todayGain: number;
  netWorth: number;
  cash: number;
  debt: number;
  investmentScore: number;
  diversificationScore: number;
  riskScore: number;
};
