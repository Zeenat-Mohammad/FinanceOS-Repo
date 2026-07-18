import { calculateInterest, fromMinor, toMinor } from './money';
import { simulatePayoff, cloneDebts } from './simulate';
import { STRATEGY_LABELS } from './strategies';
import type {
  AmortizationMonth,
  DebtInsight,
  DebtStrategy,
  EngineDebt,
  SimulationParams,
  StrategyComparison,
  StrategyResult,
  TimelineEvent
} from './types';

const COMPARISON_STRATEGIES: DebtStrategy[] = [
  'avalanche',
  'snowball',
  'highest_payment',
  'lowest_interest',
  'custom',
  'minimum'
];

function runWithBaseline(params: SimulationParams): StrategyResult {
  const minimumBaseline = simulatePayoff({
    ...params,
    debts: cloneDebts(params.debts),
    strategy: 'minimum',
    extraPaymentMinor: 0
  });

  const result = simulatePayoff({
    ...params,
    debts: cloneDebts(params.debts),
    extraPaymentMinor: params.strategy === 'minimum' ? 0 : params.extraPaymentMinor
  });

  return {
    ...result,
    interestSavedMinor: Math.max(0, minimumBaseline.totalInterestMinor - result.totalInterestMinor)
  };
}

function formatMoney(minor: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(fromMinor(minor));
}

function buildInsights(input: {
  debts: EngineDebt[];
  selected: StrategyResult;
  comparison: StrategyComparison;
  extraPaymentMinor: number;
}): DebtInsight[] {
  const insights: DebtInsight[] = [];
  const { debts, selected, comparison, extraPaymentMinor } = input;
  const totalBalance = debts.reduce((s, d) => s + d.balanceMinor, 0);

  const avalanche = comparison.results.find((r) => r.strategy === 'avalanche');
  const snowball = comparison.results.find((r) => r.strategy === 'snowball');
  const minimum = comparison.minimumBaseline;

  if (avalanche && avalanche.interestSavedMinor > 0) {
    insights.push({
      id: 'avalanche-savings',
      severity: 'positive',
      title: 'Avalanche interest savings',
      body: `Avalanche saves ${formatMoney(avalanche.interestSavedMinor)} in interest and ${Math.max(0, minimum.monthsToPayoff - avalanche.monthsToPayoff)} months versus minimum payments.`
    });
  }

  if (snowball && avalanche && snowball.payoffOrder[0]) {
    const firstSnowball = debts.find((d) => d.id === snowball.payoffOrder[0]);
    const snowballFirstMonth = snowball.debtPayoffMonths[snowball.payoffOrder[0]] ?? 0;
    const avalancheSame = avalanche.debtPayoffMonths[snowball.payoffOrder[0]];
    if (firstSnowball && avalancheSame != null && snowballFirstMonth < avalancheSame) {
      insights.push({
        id: 'snowball-first-win',
        severity: 'info',
        title: 'Snowball psychological win',
        body: `Snowball pays off ${firstSnowball.name} ${avalancheSame - snowballFirstMonth} months sooner than Avalanche.`
      });
    }
  }

  if (extraPaymentMinor > 0 && selected.monthsToPayoff > 0 && minimum.monthsToPayoff > 0) {
    const monthsSaved = Math.max(0, minimum.monthsToPayoff - selected.monthsToPayoff);
    insights.push({
      id: 'extra-payment-impact',
      severity: 'positive',
      title: 'Extra payment impact',
      body: `Adding ${formatMoney(extraPaymentMinor)}/month saves approximately ${monthsSaved} months versus minimums.`
    });
  }

  const highestApr = [...debts].filter((d) => d.balanceMinor > 0).sort((a, b) => b.aprPercent - a.aprPercent)[0];
  if (highestApr) {
    const monthlyInterest = calculateInterest(highestApr.balanceMinor, highestApr.aprPercent);
    insights.push({
      id: 'highest-interest-cost',
      severity: 'warning',
      title: 'Highest-cost debt',
      body: `${highestApr.name} costs about ${formatMoney(monthlyInterest)}/month in interest at ${highestApr.aprPercent.toFixed(2)}% APR.`
    });
  }

  const largest = [...debts].filter((d) => d.balanceMinor > 0).sort((a, b) => b.balanceMinor - a.balanceMinor)[0];
  if (largest && totalBalance > 0) {
    const share = Math.round((largest.balanceMinor / totalBalance) * 100);
    insights.push({
      id: 'largest-share',
      severity: 'info',
      title: 'Debt concentration',
      body: `${largest.name} represents ${share}% of your total debt.`
    });
  }

  if (comparison.bestByInterest === selected.strategy) {
    insights.push({
      id: 'best-strategy',
      severity: 'positive',
      title: 'Best strategy selected',
      body: `${STRATEGY_LABELS[selected.strategy]} is currently the mathematically best option for minimizing interest.`
    });
  }

  return insights;
}

/**
 * Pure DebtEngine — no React, no Supabase.
 * All money math uses integer minor units.
 */
export const DebtEngine = {
  calculateInterest,

  calculateSnowball(params: Omit<SimulationParams, 'strategy'>): StrategyResult {
    return runWithBaseline({ ...params, strategy: 'snowball' });
  },

  calculateAvalanche(params: Omit<SimulationParams, 'strategy'>): StrategyResult {
    return runWithBaseline({ ...params, strategy: 'avalanche' });
  },

  calculateCustom(params: Omit<SimulationParams, 'strategy'>): StrategyResult {
    return runWithBaseline({ ...params, strategy: 'custom' });
  },

  calculateHighestPayment(params: Omit<SimulationParams, 'strategy'>): StrategyResult {
    return runWithBaseline({ ...params, strategy: 'highest_payment' });
  },

  calculateLowestInterest(params: Omit<SimulationParams, 'strategy'>): StrategyResult {
    return runWithBaseline({ ...params, strategy: 'lowest_interest' });
  },

  generateAmortization(params: SimulationParams): AmortizationMonth[] {
    return this.run(params).schedule;
  },

  generateTimeline(params: SimulationParams): TimelineEvent[] {
    return this.run(params).timeline;
  },

  calculatePayoffDate(params: SimulationParams): StrategyResult['debtFreeDate'] {
    return this.run(params).debtFreeDate;
  },

  calculateMonthlyBalances(params: SimulationParams): StrategyResult['monthlyBalances'] {
    return this.run(params).monthlyBalances;
  },

  run(params: SimulationParams): StrategyResult {
    return runWithBaseline(params);
  },

  compareStrategies(params: Omit<SimulationParams, 'strategy'> & { strategies?: DebtStrategy[] }): StrategyComparison {
    const strategies = params.strategies ?? COMPARISON_STRATEGIES;
    const minimumBaseline = simulatePayoff({
      ...params,
      debts: cloneDebts(params.debts),
      strategy: 'minimum',
      extraPaymentMinor: 0
    });

    const results = strategies.map((strategy) => {
      const result = simulatePayoff({
        ...params,
        debts: cloneDebts(params.debts),
        strategy,
        extraPaymentMinor: strategy === 'minimum' ? 0 : params.extraPaymentMinor
      });
      return {
        ...result,
        interestSavedMinor: Math.max(0, minimumBaseline.totalInterestMinor - result.totalInterestMinor)
      };
    });

    const solvable = results.filter((r) => r.monthsToPayoff > 0);
    const bestByInterest = [...solvable].sort((a, b) => a.totalInterestMinor - b.totalInterestMinor)[0]?.strategy ?? 'avalanche';
    const bestBySpeed = [...solvable].sort((a, b) => a.monthsToPayoff - b.monthsToPayoff)[0]?.strategy ?? 'snowball';

    return {
      results,
      bestByInterest,
      bestBySpeed,
      minimumBaseline: {
        ...minimumBaseline,
        interestSavedMinor: 0
      }
    };
  },

  generateInsights(input: {
    debts: EngineDebt[];
    selected: StrategyResult;
    comparison: StrategyComparison;
    extraPaymentMinor: number;
  }): DebtInsight[] {
    return buildInsights(input);
  },

  toMinor,
  fromMinor,
  STRATEGY_LABELS
};
