/** Forecast horizon in months. */
export type ForecastHorizon = 6 | 12 | 24 | 36;

export type ForecastScenario = 'current' | 'optimistic' | 'expected' | 'conservative' | 'custom';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ForecastAlgorithm =
  | 'linear'
  | 'holt'
  | 'holt_winters'
  | 'polynomial'
  | 'exponential_smoothing'
  | 'seasonal_trend';

/** One historical or projected month point. Money in major currency units. */
export type TimePoint = {
  year: number;
  month: number; // 0-11
  label: string;
  value: number;
  kind: 'historical' | 'forecast';
  lower?: number;
  upper?: number;
};

export type SeriesForecast = {
  algorithm: ForecastAlgorithm;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0-1
  historical: TimePoint[];
  forecast: TimePoint[];
  /** Combined historical + forecast for charting. */
  series: TimePoint[];
  mape: number;
  seasonalityDetected: boolean;
};

export type ScenarioAssumptions = {
  salaryMultiplier: number;
  inflationRate: number;
  investmentReturnAnnual: number;
  monthlySavingsDelta: number;
  debtPaymentDelta: number;
  largeExpense: number;
  largeExpenseMonthOffset: number;
  extraIncome: number;
  extraIncomeMonthOffset: number;
  taxRate: number;
  jobLossMonths: number;
  jobLossStartOffset: number;
};

export type WhatIfId =
  | 'salary_up_10'
  | 'extra_debt_250'
  | 'buy_house'
  | 'job_loss_3'
  | 'vacation'
  | 'new_baby'
  | 'higher_inflation'
  | 'returns_drop';

export type ForecastInsight = {
  id: string;
  severity: 'info' | 'positive' | 'warning' | 'critical';
  title: string;
  body: string;
  monthLabel?: string;
};

export type MonthlyForecastRow = {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  debt: number;
  investment: number;
  netWorth: number;
  cashFlow: number;
  cashBalance: number;
  financialScore: number;
  kind: 'historical' | 'forecast';
};

export type GoalForecast = {
  id: string;
  name: string;
  target: number;
  current: number;
  monthlyContribution: number;
  projectedCompletionLabel: string | null;
  monthsToComplete: number | null;
  completionPct: number;
};

export type ForecastBundle = {
  horizon: ForecastHorizon;
  scenario: ForecastScenario;
  assumptions: ScenarioAssumptions;
  generatedAt: string;
  cashFlow: SeriesForecast;
  income: SeriesForecast;
  expenses: SeriesForecast;
  savings: SeriesForecast;
  debt: SeriesForecast;
  investments: SeriesForecast;
  netWorth: SeriesForecast;
  cashBalance: SeriesForecast;
  financialHealth: SeriesForecast;
  goals: GoalForecast[];
  monthlyTable: MonthlyForecastRow[];
  insights: ForecastInsight[];
  overview: {
    projectedNetWorth: number;
    currentNetWorth: number;
    projectedCashBalance: number;
    currentCashBalance: number;
    debtFreeDate: string | null;
    savingsGrowthPct: number;
    investmentGrowthPct: number;
    goalCompletionPct: number;
    financialHealthScore: number;
    financialHealthProjected: number;
  };
  negativeCashMonths: string[];
  debtFreeDate: string | null;
  activeWhatIfs: WhatIfId[];
  algorithmSummary: Record<string, ForecastAlgorithm>;
};

export type HistoricalMonth = {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  cashFlow: number;
  cashBalance: number;
  debtBalance: number;
  netWorth: number;
};

export type ForecastInput = {
  history: HistoricalMonth[];
  horizon: ForecastHorizon;
  scenario: ForecastScenario;
  assumptions: ScenarioAssumptions;
  activeWhatIfs: WhatIfId[];
  /** Optional debt balances from DebtEngine (major units). */
  debtProjection?: { label: string; balance: number; year: number; month: number }[];
  debtFreeDate?: string | null;
  startingCashBalance?: number;
  startingNetWorth?: number;
  goals?: Array<{ id: string; name: string; target: number; current: number; monthlyContribution: number }>;
};

export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  salaryMultiplier: 1,
  inflationRate: 0.03,
  investmentReturnAnnual: 0.07,
  monthlySavingsDelta: 0,
  debtPaymentDelta: 0,
  largeExpense: 0,
  largeExpenseMonthOffset: -1,
  extraIncome: 0,
  extraIncomeMonthOffset: -1,
  taxRate: 0.22,
  jobLossMonths: 0,
  jobLossStartOffset: -1
};

export const SCENARIO_PRESETS: Record<Exclude<ForecastScenario, 'custom'>, Partial<ScenarioAssumptions>> = {
  current: {},
  expected: {
    salaryMultiplier: 1.02,
    inflationRate: 0.03,
    investmentReturnAnnual: 0.07
  },
  optimistic: {
    salaryMultiplier: 1.1,
    inflationRate: 0.02,
    investmentReturnAnnual: 0.1,
    monthlySavingsDelta: 200
  },
  conservative: {
    salaryMultiplier: 0.95,
    inflationRate: 0.05,
    investmentReturnAnnual: 0.04,
    monthlySavingsDelta: -50
  }
};
