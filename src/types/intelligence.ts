import type { Json } from './finance';

export type GoalType =
  | 'emergency_fund'
  | 'vacation'
  | 'house'
  | 'car'
  | 'education'
  | 'wedding'
  | 'business'
  | 'investment'
  | 'retirement'
  | 'custom';

export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'overdue';
export type GoalRisk = 'low' | 'medium' | 'high' | 'critical';

export type SmartGoal = {
  id: string;
  household_id: string;
  user_id: string;
  name: string;
  description?: string | null;
  goal_type: GoalType;
  priority: GoalPriority;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string | null;
  expected_monthly_contribution: number;
  linked_account_id?: string | null;
  linked_investment_id?: string | null;
  auto_contribution: boolean;
  inflation_adjustment_pct: number;
  goal_image_path?: string | null;
  notes?: string | null;
  status: GoalStatus;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type GoalContribution = {
  id: string;
  household_id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  contribution_date: string;
  source: 'manual' | 'automatic' | 'account_transfer' | 'investment' | 'adjustment';
  account_id?: string | null;
  investment_id?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  metadata: Json;
  created_at: string;
  deleted_at?: string | null;
};

export type SmartGoalMetrics = {
  remainingAmount: number;
  completionPct: number;
  monthsRemaining: number;
  requiredMonthlySaving: number;
  monthlyDeficit: number;
  monthlySurplus: number;
  estimatedCompletionDate: string | null;
  riskLevel: GoalRisk;
  isSpecific: boolean;
  isMeasurable: boolean;
  isAchievable: boolean;
  isRelevant: boolean;
  isTimeBound: boolean;
  smartScore: number;
};

export type SmartGoalView = SmartGoal & SmartGoalMetrics;

export type GoalKpis = {
  totalGoals: number;
  completedGoals: number;
  onTrack: number;
  behindSchedule: number;
  needsAttention: number;
  totalTargetAmount: number;
  totalSaved: number;
  averageCompletion: number;
};

export type GoalsBundle = {
  goals: SmartGoalView[];
  contributions: GoalContribution[];
  kpis: GoalKpis;
  monthlyContributions: Array<{ month: string; amount: number }>;
  upcomingContributions: Array<{ goalId: string; goalName: string; date: string; amount: number }>;
};

export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type BudgetAlertStatus = 'none' | 'healthy' | 'watch' | 'critical' | 'exceeded';

export type BudgetCategoryRow = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  budget: number;
  spent: number;
  remaining: number;
  utilizationPct: number;
  monthlyTrendPct: number;
  dailySpikePct: number;
  alertStatus: BudgetAlertStatus;
  period: BudgetPeriod;
  periodStart: string;
  periodEnd: string;
  monthlyHistory: Array<{ month: string; amount: number }>;
};

export type BudgetKpis = {
  utilizationPct: number;
  averageSpending: number;
  highestSpendingMonth: { month: string; amount: number } | null;
  lowestSpendingMonth: { month: string; amount: number } | null;
  remainingBudget: number;
  predictedPeriodEndSpending: number;
  accuracyPct: number;
  efficiencyPct: number;
};

export type BudgetBundle = {
  rows: BudgetCategoryRow[];
  kpis: BudgetKpis;
  monthlyTrend: Array<{ month: string; budget: number; actual: number }>;
  distribution: Array<{ name: string; value: number; color?: string | null }>;
};

export type FeedbackCategory = 'feature' | 'bug' | 'suggestion' | 'complaint' | 'general';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'completed' | 'duplicate';

export type FeedbackReply = {
  id: string;
  feedback_id: string;
  author_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type FeedbackItem = {
  id: string;
  household_id?: string | null;
  user_id: string;
  rating: number;
  title: string;
  category: FeedbackCategory;
  description: string;
  screenshot_path?: string | null;
  priority: FeedbackPriority;
  email?: string | null;
  device_info?: string | null;
  browser_info?: string | null;
  app_version?: string | null;
  status: FeedbackStatus;
  assigned_to?: string | null;
  duplicate_of?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  metadata: Json;
  feedback_reply?: FeedbackReply[];
};

export type FinancialNotificationSource =
  | 'goal'
  | 'budget'
  | 'debt'
  | 'bill'
  | 'investment'
  | 'forecast'
  | 'inflation'
  | 'news'
  | 'feedback'
  | 'system';

export type FinancialNotification = {
  id: string;
  household_id: string;
  user_id: string;
  source_type: FinancialNotificationSource;
  source_id?: string | null;
  alert_type: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message: string;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  expires_at?: string | null;
  metadata: Json;
};

export type InflationPoint = { year: number; rate: number };
export type InflationSnapshot = {
  countryCode: string;
  currentRate: number;
  historical: InflationPoint[];
  forecast: InflationPoint[];
  provider: string;
  fetchedAt: string;
  isFallback: boolean;
};

