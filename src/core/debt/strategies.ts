import type { DebtStrategy, EngineDebt } from './types';

/**
 * Returns debt IDs ordered by payoff priority for the given strategy.
 * Active debts only (balance > 0). Extra-payment-disallowed debts stay at the end.
 */
export function orderDebtsByStrategy(debts: EngineDebt[], strategy: DebtStrategy): string[] {
  const active = debts.filter((d) => d.balanceMinor > 0);
  const eligible = active.filter((d) => d.extraPaymentAllowed);
  const ineligible = active.filter((d) => !d.extraPaymentAllowed);

  const sortedEligible = [...eligible].sort((a, b) => compareForStrategy(a, b, strategy));
  return [...sortedEligible.map((d) => d.id), ...ineligible.map((d) => d.id)];
}

function compareForStrategy(a: EngineDebt, b: EngineDebt, strategy: DebtStrategy): number {
  switch (strategy) {
    case 'snowball':
      return a.balanceMinor - b.balanceMinor || a.aprPercent - b.aprPercent || a.name.localeCompare(b.name);
    case 'avalanche':
      return b.aprPercent - a.aprPercent || a.balanceMinor - b.balanceMinor || a.name.localeCompare(b.name);
    case 'highest_payment':
      return b.monthlyPaymentMinor - a.monthlyPaymentMinor || b.aprPercent - a.aprPercent || a.name.localeCompare(b.name);
    case 'lowest_interest':
      return a.aprPercent - b.aprPercent || a.balanceMinor - b.balanceMinor || a.name.localeCompare(b.name);
    case 'custom':
      return (a.customOrder ?? 0) - (b.customOrder ?? 0) || a.name.localeCompare(b.name);
    case 'minimum':
    default:
      return a.name.localeCompare(b.name);
  }
}

export const STRATEGY_LABELS: Record<DebtStrategy, string> = {
  snowball: 'Snowball (Lowest Balance First)',
  avalanche: 'Avalanche (Highest Interest First)',
  highest_payment: 'Highest Payment First',
  lowest_interest: 'Lowest Interest First',
  custom: 'Custom Order',
  minimum: 'Minimum Payments Only'
};

export const STRATEGY_DESCRIPTIONS: Record<DebtStrategy, string> = {
  snowball: 'Pay minimums on all debts. Put every extra dollar toward the smallest balance, then roll payments forward.',
  avalanche: 'Pay minimums on all debts. Put every extra dollar toward the highest APR, then roll to the next highest.',
  highest_payment: 'Prioritize the debt with the largest contractual monthly payment.',
  lowest_interest: 'Prioritize the debt with the lowest APR first.',
  custom: 'Follow your drag-and-drop payoff order.',
  minimum: 'Pay only the minimum on every debt with no extra payments.'
};
