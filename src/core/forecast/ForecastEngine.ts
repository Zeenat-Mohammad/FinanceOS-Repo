import { detectSeasonality } from './algorithms';
import { forecastSeries, calculateConfidence } from './series';
import { resolveAssumptions, adjustPath } from './scenarios';
import { generateForecastInsights } from './insights';
import { addMonths, formatMonthLabel, pctChange, clamp } from './utils';
import type {
  ForecastBundle,
  ForecastHorizon,
  ForecastInput,
  GoalForecast,
  HistoricalMonth,
  MonthlyForecastRow,
  SeriesForecast,
  ScenarioAssumptions
} from './types';
import { DEFAULT_ASSUMPTIONS } from './types';

function forecastMetric(
  history: HistoricalMonth[],
  horizon: ForecastHorizon,
  key: keyof Pick<HistoricalMonth, 'income' | 'expenses' | 'savings' | 'investments' | 'cashFlow'>,
  assumptions: ScenarioAssumptions,
  adjustKind: 'income' | 'expenses' | 'savings' | 'investments'
): SeriesForecast {
  const meta = history.map((h) => ({ year: h.year, month: h.month, label: h.label }));
  const values = history.map((h) => Number(h[key]));
  const base = forecastSeries(values, meta, horizon);
  const adjusted = adjustPath(
    base.forecast.map((p) => p.value),
    adjustKind,
    assumptions
  );
  const forecast = base.forecast.map((p, i) => {
    const value = adjusted[i] ?? p.value;
    const band = Math.abs(value) * clamp(base.mape, 0.05, 0.35);
    return { ...p, value, lower: value - band, upper: value + band };
  });
  return { ...base, forecast, series: [...base.historical, ...forecast] };
}

function composeCashFlow(
  income: SeriesForecast,
  expenses: SeriesForecast,
  history: HistoricalMonth[],
  horizon: number
): SeriesForecast {
  const meta = history.map((h) => ({ year: h.year, month: h.month, label: h.label }));
  const histValues = history.map((h) => h.cashFlow);
  const base = forecastSeries(histValues, meta, horizon);
  const forecast = income.forecast.map((p, i) => {
    const value = (income.forecast[i]?.value ?? 0) - (expenses.forecast[i]?.value ?? 0);
    const band = Math.abs(value) * 0.15 + 100;
    return { ...p, value, lower: value - band, upper: value + band };
  });
  return {
    ...base,
    algorithm: income.algorithm,
    forecast,
    series: [...base.historical, ...forecast],
    confidenceScore: Math.min(income.confidenceScore, expenses.confidenceScore),
    confidence:
      income.confidenceScore < 0.45 || expenses.confidenceScore < 0.45
        ? 'low'
        : income.confidence
  };
}

function composeCashBalance(
  history: HistoricalMonth[],
  cashFlow: SeriesForecast,
  assumptions: ScenarioAssumptions
): SeriesForecast {
  const historical = history.map((h) => ({
    year: h.year,
    month: h.month,
    label: h.label,
    value: h.cashBalance,
    kind: 'historical' as const
  }));
  let balance = historical.at(-1)?.value ?? 0;
  const forecast = cashFlow.forecast.map((p, i) => {
    balance += p.value - assumptions.debtPaymentDelta;
    if (i === assumptions.largeExpenseMonthOffset) balance -= assumptions.largeExpense * 0.25;
    const band = Math.abs(balance) * 0.1 + 250;
    return {
      year: p.year,
      month: p.month,
      label: p.label,
      value: balance,
      kind: 'forecast' as const,
      lower: balance - band,
      upper: balance + band
    };
  });
  return {
    algorithm: cashFlow.algorithm,
    confidence: cashFlow.confidence,
    confidenceScore: cashFlow.confidenceScore,
    historical,
    forecast,
    series: [...historical, ...forecast],
    mape: cashFlow.mape,
    seasonalityDetected: cashFlow.seasonalityDetected
  };
}

function scoreMonth(cashFlow: number, savings: number, debt: number, income: number): number {
  let score = 55;
  if (cashFlow > 0) score += 12;
  if (cashFlow < 0) score -= 15;
  if (income > 0 && savings / income > 0.15) score += 10;
  if (debt > 0 && income > 0 && debt / (income * 12) > 0.4) score -= 10;
  if (debt <= 0) score += 8;
  return clamp(score, 0, 100);
}

function buildMonthlyTable(params: {
  history: HistoricalMonth[];
  income: SeriesForecast;
  expenses: SeriesForecast;
  savings: SeriesForecast;
  debt: SeriesForecast;
  investments: SeriesForecast;
  cashBalance: SeriesForecast;
  netWorth: SeriesForecast;
  cashFlow: SeriesForecast;
}): MonthlyForecastRow[] {
  const rows: MonthlyForecastRow[] = params.history.map((h) => ({
    year: h.year,
    month: h.month,
    label: h.label,
    income: h.income,
    expenses: h.expenses,
    savings: h.savings,
    debt: h.debtBalance,
    investment: h.investments,
    netWorth: h.netWorth,
    cashFlow: h.cashFlow,
    cashBalance: h.cashBalance,
    financialScore: scoreMonth(h.cashFlow, h.savings, h.debtBalance, h.income),
    kind: 'historical'
  }));

  for (let i = 0; i < params.income.forecast.length; i++) {
    const income = params.income.forecast[i].value;
    const expenses = params.expenses.forecast[i].value;
    const savings = params.savings.forecast[i].value;
    const debt = params.debt.forecast[i]?.value ?? 0;
    const investment = params.investments.forecast[i].value;
    const cashFlow = params.cashFlow.forecast[i].value;
    const cashBalance = params.cashBalance.forecast[i].value;
    const netWorth = params.netWorth.forecast[i].value;
    rows.push({
      year: params.income.forecast[i].year,
      month: params.income.forecast[i].month,
      label: params.income.forecast[i].label,
      income,
      expenses,
      savings,
      debt,
      investment,
      netWorth,
      cashFlow,
      cashBalance,
      financialScore: scoreMonth(cashFlow, savings, debt, income),
      kind: 'forecast'
    });
  }
  return rows;
}

/** Seed synthetic history when ledger is thin so models still run. */
export function ensureHistory(
  history: HistoricalMonth[],
  startingCash = 8500,
  _startingNetWorth = 42000
): HistoricalMonth[] {
  if (history.length >= 3) return history;

  const now = new Date();
  const seeded: HistoricalMonth[] = [];
  let cash = startingCash * 0.7;
  let savings = 3500;
  let investments = 12000;
  let debt = 28450;
  const months = Math.max(12, history.length);

  for (let i = months - 1; i >= 0; i--) {
    const { year, month } = addMonths(now.getFullYear(), now.getMonth(), -i);
    const seasonal = 1 + 0.08 * Math.sin((month / 12) * Math.PI * 2);
    const income = 6200 * seasonal + (month === 11 ? 800 : 0);
    const expenses = 4100 * (1 + 0.04 * Math.sin(((month + 3) / 12) * Math.PI * 2)) + (month === 11 ? 600 : 0);
    const cashFlow = income - expenses;
    cash += cashFlow * 0.35;
    savings += Math.max(0, cashFlow * 0.2);
    investments += 400 + investments * 0.005;
    debt = Math.max(0, debt - 650);
    const existing = history.find((h) => h.year === year && h.month === month);
    seeded.push(
      existing ?? {
        year,
        month,
        label: formatMonthLabel(year, month),
        income,
        expenses,
        savings,
        investments,
        cashFlow,
        cashBalance: cash,
        debtBalance: debt,
        netWorth: cash + savings + investments - debt
      }
    );
  }

  return seeded.map((row) => {
    const real = history.find((h) => h.year === row.year && h.month === row.month);
    return real ?? row;
  });
}

/**
 * Pure ForecastEngine — no React, no Supabase.
 * Selects linear / Holt / Holt-Winters / polynomial based on history length & seasonality.
 */
export const ForecastEngine = {
  calculateConfidence,
  detectSeasonality,

  forecastCashFlow(history: HistoricalMonth[], horizon: ForecastHorizon, assumptions: ScenarioAssumptions): SeriesForecast {
    return forecastMetric(history, horizon, 'cashFlow', assumptions, 'income');
  },

  forecastIncome(history: HistoricalMonth[], horizon: ForecastHorizon, assumptions: ScenarioAssumptions): SeriesForecast {
    return forecastMetric(history, horizon, 'income', assumptions, 'income');
  },

  forecastExpenses(history: HistoricalMonth[], horizon: ForecastHorizon, assumptions: ScenarioAssumptions): SeriesForecast {
    return forecastMetric(history, horizon, 'expenses', assumptions, 'expenses');
  },

  forecastSavings(history: HistoricalMonth[], horizon: ForecastHorizon, assumptions: ScenarioAssumptions): SeriesForecast {
    return forecastMetric(history, horizon, 'savings', assumptions, 'savings');
  },

  forecastDebt(history: HistoricalMonth[], horizon: ForecastHorizon, debtProjection?: ForecastInput['debtProjection']): SeriesForecast {
    const meta = history.map((h) => ({ year: h.year, month: h.month, label: h.label }));
    const values = history.map((h) => h.debtBalance);
    const base = forecastSeries(values, meta, horizon);

    if (debtProjection && debtProjection.length > 0) {
      const forecast = debtProjection.slice(0, horizon).map((p) => ({
        year: p.year,
        month: p.month,
        label: p.label,
        value: Math.max(0, p.balance),
        kind: 'forecast' as const,
        lower: Math.max(0, p.balance * 0.95),
        upper: p.balance * 1.05
      }));
      while (forecast.length < horizon) {
        const last = forecast[forecast.length - 1] ?? base.forecast[0];
        const next = addMonths(last.year, last.month, 1);
        forecast.push({
          year: next.year,
          month: next.month,
          label: formatMonthLabel(next.year, next.month),
          value: 0,
          kind: 'forecast',
          lower: 0,
          upper: 0
        });
      }
      return {
        ...base,
        algorithm: 'holt',
        forecast,
        series: [...base.historical, ...forecast],
        confidence: 'high',
        confidenceScore: Math.max(base.confidenceScore, 0.75)
      };
    }

    return {
      ...base,
      forecast: base.forecast.map((p) => ({
        ...p,
        value: Math.max(0, p.value),
        lower: Math.max(0, p.lower ?? p.value),
        upper: Math.max(0, p.upper ?? p.value)
      })),
      series: [...base.historical, ...base.forecast.map((p) => ({ ...p, value: Math.max(0, p.value) }))]
    };
  },

  forecastInvestments(history: HistoricalMonth[], horizon: ForecastHorizon, assumptions: ScenarioAssumptions): SeriesForecast {
    return forecastMetric(history, horizon, 'investments', assumptions, 'investments');
  },

  forecastNetWorth(params: {
    cashBalance: SeriesForecast;
    savings: SeriesForecast;
    investments: SeriesForecast;
    debt: SeriesForecast;
  }): SeriesForecast {
    const historical = params.cashBalance.historical.map((p, i) => ({
      ...p,
      value:
        (params.cashBalance.historical[i]?.value ?? 0) +
        (params.savings.historical[i]?.value ?? 0) +
        (params.investments.historical[i]?.value ?? 0) -
        (params.debt.historical[i]?.value ?? 0)
    }));

    const forecast = params.cashBalance.forecast.map((p, i) => {
      const value =
        (params.cashBalance.forecast[i]?.value ?? 0) +
        (params.savings.forecast[i]?.value ?? 0) +
        (params.investments.forecast[i]?.value ?? 0) -
        (params.debt.forecast[i]?.value ?? 0);
      const band = Math.abs(value) * 0.12;
      return { ...p, value, lower: value - band, upper: value + band };
    });

    const confScores = [
      params.cashBalance.confidenceScore,
      params.savings.confidenceScore,
      params.investments.confidenceScore,
      params.debt.confidenceScore
    ];
    const score = confScores.reduce((a, b) => a + b, 0) / confScores.length;

    return {
      algorithm: 'seasonal_trend',
      confidence: score >= 0.7 ? 'high' : score >= 0.45 ? 'medium' : 'low',
      confidenceScore: score,
      historical,
      forecast,
      series: [...historical, ...forecast],
      mape: (params.cashBalance.mape + params.debt.mape) / 2,
      seasonalityDetected: params.cashBalance.seasonalityDetected
    };
  },

  forecastFinancialHealth(monthly: MonthlyForecastRow[]): SeriesForecast {
    const values = monthly.filter((m) => m.kind === 'historical').map((m) => m.financialScore);
    const meta = monthly
      .filter((m) => m.kind === 'historical')
      .map((m) => ({ year: m.year, month: m.month, label: m.label }));
    const horizon = monthly.filter((m) => m.kind === 'forecast').length || 12;
    const now = new Date();
    const base = forecastSeries(
      values.length ? values : [55],
      meta.length ? meta : [{ year: now.getFullYear(), month: now.getMonth(), label: 'Now' }],
      horizon
    );
    return {
      ...base,
      forecast: base.forecast.map((p) => ({ ...p, value: clamp(p.value, 0, 100) })),
      series: [
        ...base.historical.map((p) => ({ ...p, value: clamp(p.value, 0, 100) })),
        ...base.forecast.map((p) => ({ ...p, value: clamp(p.value, 0, 100) }))
      ]
    };
  },

  forecastGoals(
    goals: ForecastInput['goals'],
    savingsForecast: SeriesForecast,
    assumptions: ScenarioAssumptions
  ): GoalForecast[] {
    const list = goals?.length
      ? goals
      : [
          { id: 'emergency', name: 'Emergency Fund', target: 15000, current: 4200, monthlyContribution: 400 },
          { id: 'vacation', name: 'Vacation', target: 5000, current: 1200, monthlyContribution: 150 },
          { id: 'house', name: 'House', target: 80000, current: 18500, monthlyContribution: 600 },
          { id: 'education', name: 'Education', target: 25000, current: 6100, monthlyContribution: 200 },
          {
            id: 'retirement',
            name: 'Retirement',
            target: 100000,
            current: Math.max(0, savingsForecast.historical.at(-1)?.value ?? 12000),
            monthlyContribution: 500
          }
        ];

    return list.map((goal) => {
      const contribution = Math.max(0, goal.monthlyContribution + assumptions.monthlySavingsDelta * 0.25);
      let balance = goal.current;
      let months: number | null = null;
      let label: string | null = null;
      const start = savingsForecast.forecast[0] ?? savingsForecast.historical.at(-1);

      for (let i = 0; i < 120; i++) {
        balance += contribution;
        if (balance >= goal.target) {
          months = i + 1;
          if (start) {
            const d = addMonths(start.year, start.month, i);
            label = formatMonthLabel(d.year, d.month);
          }
          break;
        }
      }

      return {
        id: goal.id,
        name: goal.name,
        target: goal.target,
        current: goal.current,
        monthlyContribution: contribution,
        projectedCompletionLabel: label,
        monthsToComplete: months,
        completionPct: clamp((goal.current / Math.max(goal.target, 1)) * 100, 0, 100)
      };
    });
  },

  run(input: ForecastInput): ForecastBundle {
    const assumptions = resolveAssumptions(input.scenario, input.assumptions, input.activeWhatIfs);
    const history = ensureHistory(input.history, input.startingCashBalance, input.startingNetWorth);

    const income = this.forecastIncome(history, input.horizon, assumptions);
    const expenses = this.forecastExpenses(history, input.horizon, assumptions);
    const savings = this.forecastSavings(history, input.horizon, assumptions);
    const investments = this.forecastInvestments(history, input.horizon, assumptions);
    const debt = this.forecastDebt(history, input.horizon, input.debtProjection);

    const cashFlow = composeCashFlow(income, expenses, history, input.horizon);
    const cashBalance = composeCashBalance(history, cashFlow, assumptions);
    const netWorth = this.forecastNetWorth({ cashBalance, savings, investments, debt });

    const goals = this.forecastGoals(input.goals, savings, assumptions);
    const monthlyTable = buildMonthlyTable({
      history,
      income,
      expenses,
      savings,
      debt,
      investments,
      cashBalance,
      netWorth,
      cashFlow
    });
    const financialHealth = this.forecastFinancialHealth(monthlyTable);

    const negativeCashMonths = cashBalance.forecast.filter((p) => p.value < 0).map((p) => p.label);
    const debtFreeDate =
      input.debtFreeDate ?? debt.forecast.find((p) => p.value <= 0)?.label ?? null;

    const insights = generateForecastInsights({
      monthlyTable,
      goals,
      debtFreeDate,
      savings,
      investments,
      cashBalance,
      negativeCashMonths
    });

    const currentNetWorth = netWorth.historical.at(-1)?.value ?? 0;
    const projectedNetWorth = netWorth.forecast.at(-1)?.value ?? currentNetWorth;
    const currentCash = cashBalance.historical.at(-1)?.value ?? 0;
    const projectedCash = cashBalance.forecast.at(-1)?.value ?? currentCash;
    const savingsStart = savings.historical.at(-1)?.value ?? 0;
    const savingsEnd = savings.forecast.at(-1)?.value ?? savingsStart;
    const investStart = investments.historical.at(-1)?.value ?? 0;
    const investEnd = investments.forecast.at(-1)?.value ?? investStart;
    const goalCompletionPct =
      goals.length === 0 ? 0 : goals.reduce((s, g) => s + g.completionPct, 0) / goals.length;

    return {
      horizon: input.horizon,
      scenario: input.scenario,
      assumptions,
      generatedAt: new Date().toISOString(),
      cashFlow,
      income,
      expenses,
      savings,
      debt,
      investments,
      netWorth,
      cashBalance,
      financialHealth,
      goals,
      monthlyTable,
      insights,
      overview: {
        projectedNetWorth,
        currentNetWorth,
        projectedCashBalance: projectedCash,
        currentCashBalance: currentCash,
        debtFreeDate,
        savingsGrowthPct: pctChange(savingsStart, savingsEnd),
        investmentGrowthPct: pctChange(investStart, investEnd),
        goalCompletionPct,
        financialHealthScore: financialHealth.historical.at(-1)?.value ?? 60,
        financialHealthProjected: financialHealth.forecast.at(-1)?.value ?? 60
      },
      negativeCashMonths,
      debtFreeDate,
      activeWhatIfs: input.activeWhatIfs,
      algorithmSummary: {
        cashFlow: cashFlow.algorithm,
        income: income.algorithm,
        expenses: expenses.algorithm,
        savings: savings.algorithm,
        debt: debt.algorithm,
        investments: investments.algorithm,
        netWorth: netWorth.algorithm
      }
    };
  }
};

export type { ForecastInput, ForecastBundle, ForecastHorizon, ScenarioAssumptions };
export { DEFAULT_ASSUMPTIONS };
