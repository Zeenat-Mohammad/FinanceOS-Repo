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
  calendar: ChallengeDay[];
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
