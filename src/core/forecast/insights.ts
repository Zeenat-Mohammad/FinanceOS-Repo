import type { ForecastBundle, ForecastInsight, GoalForecast, MonthlyForecastRow, SeriesForecast } from './types';
import { pctChange } from './utils';

export function generateForecastInsights(input: {
  monthlyTable: MonthlyForecastRow[];
  goals: GoalForecast[];
  debtFreeDate: string | null;
  savings: SeriesForecast;
  investments: SeriesForecast;
  cashBalance: SeriesForecast;
  negativeCashMonths: string[];
}): ForecastInsight[] {
  const insights: ForecastInsight[] = [];
  const { monthlyTable, goals, debtFreeDate, savings, investments, cashBalance, negativeCashMonths } = input;

  if (negativeCashMonths.length > 0) {
    insights.push({
      id: 'negative-cash',
      severity: 'critical',
      title: 'Cash runway risk',
      body: `Cash balance becomes negative in ${negativeCashMonths[0]}.`,
      monthLabel: negativeCashMonths[0]
    });
  }

  const decemberPressure = monthlyTable.find(
    (row) => row.kind === 'forecast' && row.month === 11 && row.expenses > row.income
  );
  if (decemberPressure) {
    insights.push({
      id: 'december-spend',
      severity: 'warning',
      title: 'Seasonal expense pressure',
      body: `Expenses likely to exceed income during ${decemberPressure.label}.`,
      monthLabel: decemberPressure.label
    });
  }

  if (debtFreeDate) {
    insights.push({
      id: 'debt-free',
      severity: 'positive',
      title: 'Debt freedom ahead',
      body: `Projected debt-free date is ${debtFreeDate}.`
    });
  }

  const savingsStart = savings.historical.at(-1)?.value ?? savings.series[0]?.value ?? 0;
  const savingsEnd = savings.forecast.at(-1)?.value ?? savingsStart;
  const savingsPct = pctChange(savingsStart, savingsEnd);
  if (Math.abs(savingsPct) >= 5) {
    insights.push({
      id: 'savings-growth',
      severity: savingsPct >= 0 ? 'positive' : 'warning',
      title: 'Savings trajectory',
      body: `Savings ${savingsPct >= 0 ? 'increase' : 'decrease'} by ${Math.abs(savingsPct).toFixed(0)}% over the forecast horizon.`
    });
  }

  const investEnd = investments.forecast.at(-1)?.value ?? 0;
  if (investEnd >= 100000) {
    insights.push({
      id: 'invest-100k',
      severity: 'positive',
      title: 'Portfolio milestone',
      body: `Retirement / investment fund is projected to exceed $100k (${formatMoney(investEnd)}).`
    });
  }

  for (const goal of goals) {
    if (goal.projectedCompletionLabel) {
      insights.push({
        id: `goal-${goal.id}`,
        severity: 'positive',
        title: `${goal.name} on track`,
        body: `${goal.name} reaches target in ${goal.projectedCompletionLabel}.`,
        monthLabel: goal.projectedCompletionLabel
      });
    }
  }

  const cashEnd = cashBalance.forecast.at(-1)?.value ?? 0;
  const cashStart = cashBalance.historical.at(-1)?.value ?? 0;
  if (cashEnd > cashStart * 1.15) {
    insights.push({
      id: 'cash-growth',
      severity: 'info',
      title: 'Liquidity improving',
      body: `Projected cash balance rises to ${formatMoney(cashEnd)} by the end of the horizon.`
    });
  }

  return insights.slice(0, 8);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function summarizeAlgorithms(bundle: Pick<ForecastBundle, 'cashFlow' | 'income' | 'expenses' | 'savings' | 'debt' | 'investments' | 'netWorth'>): Record<string, string> {
  return {
    cashFlow: bundle.cashFlow.algorithm,
    income: bundle.income.algorithm,
    expenses: bundle.expenses.algorithm,
    savings: bundle.savings.algorithm,
    debt: bundle.debt.algorithm,
    investments: bundle.investments.algorithm,
    netWorth: bundle.netWorth.algorithm
  };
}
