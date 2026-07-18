/** Payoff strategy identifiers used by DebtEngine. */
export type DebtStrategy =
  | 'snowball'
  | 'avalanche'
  | 'highest_payment'
  | 'lowest_interest'
  | 'custom'
  | 'minimum';

export type DebtType =
  | 'credit_card'
  | 'personal_loan'
  | 'car_loan'
  | 'mortgage'
  | 'student_loan'
  | 'other';

/** Engine input debt — all money fields are integer minor units (cents). */
export type EngineDebt = {
  id: string;
  name: string;
  type: DebtType;
  /** Remaining principal in minor units. */
  balanceMinor: number;
  /** APR as percent, e.g. 24.99 for 24.99%. */
  aprPercent: number;
  /** Contractual minimum payment in minor units. */
  minimumPaymentMinor: number;
  /** Actual monthly payment currently made (may exceed minimum). */
  monthlyPaymentMinor: number;
  /** When false, this debt never receives strategy extra payments. */
  extraPaymentAllowed: boolean;
  /** Original balance for progress bars; defaults to balanceMinor if omitted. */
  originalBalanceMinor?: number;
  /** Custom priority rank (lower = sooner). Used by `custom` strategy. */
  customOrder?: number;
};

export type SimulationParams = {
  debts: EngineDebt[];
  strategy: DebtStrategy;
  /** Extra dollars (minor units) applied each month on top of minimums. */
  extraPaymentMinor: number;
  /** Simulation start: month 0–11, year e.g. 2026. */
  startMonth: number;
  startYear: number;
  /** Safety cap to avoid infinite loops (default 600 = 50 years). */
  maxMonths?: number;
};

export type DebtMonthBreakdown = {
  debtId: string;
  paymentMinor: number;
  interestMinor: number;
  principalMinor: number;
  endingBalanceMinor: number;
};

export type AmortizationMonth = {
  monthIndex: number;
  year: number;
  month: number;
  label: string;
  startingBalanceMinor: number;
  totalPaymentMinor: number;
  totalPrincipalMinor: number;
  totalInterestMinor: number;
  extraPaymentMinor: number;
  endingBalanceMinor: number;
  debts: DebtMonthBreakdown[];
};

export type TimelineEvent = {
  monthIndex: number;
  year: number;
  month: number;
  label: string;
  debtId: string | null;
  debtName: string;
  kind: 'start' | 'paid_off' | 'all_clear';
};

export type StrategyResult = {
  strategy: DebtStrategy;
  monthsToPayoff: number;
  debtFreeDate: { year: number; month: number; label: string } | null;
  totalInterestMinor: number;
  totalPaidMinor: number;
  interestSavedMinor: number;
  payoffOrder: string[];
  schedule: AmortizationMonth[];
  timeline: TimelineEvent[];
  monthlyBalances: { monthIndex: number; label: string; balanceMinor: number; paymentMinor: number }[];
  debtPayoffMonths: Record<string, number>;
};

export type StrategyComparison = {
  results: StrategyResult[];
  bestByInterest: DebtStrategy;
  bestBySpeed: DebtStrategy;
  minimumBaseline: StrategyResult;
};

export type DebtInsight = {
  id: string;
  severity: 'info' | 'positive' | 'warning';
  title: string;
  body: string;
};
