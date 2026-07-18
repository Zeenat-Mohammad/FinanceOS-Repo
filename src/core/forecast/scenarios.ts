import type { ScenarioAssumptions, WhatIfId, ForecastScenario } from './types';
import { DEFAULT_ASSUMPTIONS, SCENARIO_PRESETS } from './types';

export function resolveAssumptions(
  scenario: ForecastScenario,
  custom: Partial<ScenarioAssumptions> | undefined,
  whatIfs: WhatIfId[]
): ScenarioAssumptions {
  const base: ScenarioAssumptions = {
    ...DEFAULT_ASSUMPTIONS,
    ...(scenario === 'custom' ? {} : SCENARIO_PRESETS[scenario]),
    // Custom scenario (or explicit partial overrides) applied last — never let a full
    // DEFAULT_ASSUMPTIONS object wipe preset multipliers for optimistic/conservative.
    ...(scenario === 'custom' ? (custom ?? {}) : omitDefaultNoise(custom))
  };

  return applyWhatIfs(base, whatIfs);
}

/** Keep only keys that differ from defaults so callers can safely pass DEFAULT_ASSUMPTIONS. */
function omitDefaultNoise(custom: Partial<ScenarioAssumptions> | undefined): Partial<ScenarioAssumptions> {
  if (!custom) return {};
  const out: Partial<ScenarioAssumptions> = {};
  (Object.keys(custom) as Array<keyof ScenarioAssumptions>).forEach((key) => {
    const value = custom[key];
    if (value !== undefined && value !== DEFAULT_ASSUMPTIONS[key]) {
      (out as Record<string, unknown>)[key] = value;
    }
  });
  return out;
}

export function applyWhatIfs(assumptions: ScenarioAssumptions, whatIfs: WhatIfId[]): ScenarioAssumptions {
  const next = { ...assumptions };

  for (const id of whatIfs) {
    switch (id) {
      case 'salary_up_10':
        next.salaryMultiplier *= 1.1;
        break;
      case 'extra_debt_250':
        next.debtPaymentDelta += 250;
        break;
      case 'buy_house':
        next.largeExpense = Math.max(next.largeExpense, 45000);
        next.largeExpenseMonthOffset = next.largeExpenseMonthOffset >= 0 ? next.largeExpenseMonthOffset : 8;
        next.monthlySavingsDelta -= 800;
        break;
      case 'job_loss_3':
        next.jobLossMonths = Math.max(next.jobLossMonths, 3);
        next.jobLossStartOffset = next.jobLossStartOffset >= 0 ? next.jobLossStartOffset : 2;
        break;
      case 'vacation':
        next.largeExpense = Math.max(next.largeExpense, 3500);
        next.largeExpenseMonthOffset = next.largeExpenseMonthOffset >= 0 ? next.largeExpenseMonthOffset : 4;
        break;
      case 'new_baby':
        next.monthlySavingsDelta -= 400;
        next.inflationRate += 0.01;
        break;
      case 'higher_inflation':
        next.inflationRate = Math.max(next.inflationRate, 0.07);
        break;
      case 'returns_drop':
        next.investmentReturnAnnual = Math.min(next.investmentReturnAnnual, 0.02);
        break;
    }
  }

  return next;
}

export const WHAT_IF_CARDS: Array<{ id: WhatIfId; title: string; description: string }> = [
  { id: 'salary_up_10', title: 'Salary +10%', description: 'What happens if your salary increases 10%?' },
  { id: 'extra_debt_250', title: 'Extra debt $250', description: 'Pay an additional $250/month toward debt.' },
  { id: 'buy_house', title: 'Buy a house', description: 'Large down payment plus higher monthly costs.' },
  { id: 'job_loss_3', title: 'Job loss 3 months', description: 'Income drops for three months mid-horizon.' },
  { id: 'vacation', title: 'Vacation', description: 'A $3,500 trip in a few months.' },
  { id: 'new_baby', title: 'New baby', description: 'Higher ongoing costs and less savings capacity.' },
  { id: 'higher_inflation', title: 'Higher inflation', description: 'Expenses grow faster at ~7% inflation.' },
  { id: 'returns_drop', title: 'Returns drop', description: 'Investment returns fall to ~2% annually.' }
];

/** Apply scenario multipliers to a projected income/expense path. */
export function adjustPath(
  values: number[],
  kind: 'income' | 'expenses' | 'savings' | 'investments',
  assumptions: ScenarioAssumptions
): number[] {
  const monthlyInflation = assumptions.inflationRate / 12;
  const monthlyReturn = assumptions.investmentReturnAnnual / 12;

  return values.map((raw, i) => {
    let value = raw;
    if (kind === 'income') {
      value *= assumptions.salaryMultiplier * (1 - assumptions.taxRate * 0.05);
      if (
        assumptions.jobLossMonths > 0 &&
        assumptions.jobLossStartOffset >= 0 &&
        i >= assumptions.jobLossStartOffset &&
        i < assumptions.jobLossStartOffset + assumptions.jobLossMonths
      ) {
        value *= 0.15;
      }
      if (i === assumptions.extraIncomeMonthOffset) value += assumptions.extraIncome;
    }
    if (kind === 'expenses') {
      value *= (1 + monthlyInflation) ** (i + 1);
      if (i === assumptions.largeExpenseMonthOffset) value += assumptions.largeExpense;
    }
    if (kind === 'savings') {
      value = Math.max(0, value + assumptions.monthlySavingsDelta);
    }
    if (kind === 'investments') {
      value = value * (1 + monthlyReturn) + assumptions.monthlySavingsDelta * 0.4;
    }
    return value;
  });
}
