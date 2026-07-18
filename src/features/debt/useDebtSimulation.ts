import { useMemo } from 'react';
import { DebtEngine, type EngineDebt, type DebtStrategy } from '@/core/debt';
import type { DebtAccount, DebtSimulationSettings } from '@/types/debt';

export function toEngineDebts(debts: DebtAccount[], customOrder: string[]): EngineDebt[] {
  const active = debts.filter((d) => d.status === 'active' && !d.deleted_at && d.balance_minor > 0);
  return active.map((d) => {
    const orderIndex = customOrder.indexOf(d.id);
    return {
      id: d.id,
      name: d.name,
      type: d.type,
      balanceMinor: d.balance_minor,
      aprPercent: d.apr_percent,
      minimumPaymentMinor: d.minimum_payment_minor,
      monthlyPaymentMinor: d.monthly_payment_minor,
      extraPaymentAllowed: d.extra_payment_allowed,
      originalBalanceMinor: d.original_balance_minor,
      customOrder: orderIndex >= 0 ? orderIndex : d.custom_order
    };
  });
}

export function useDebtSimulation(debts: DebtAccount[], settings: DebtSimulationSettings) {
  return useMemo(() => {
    const engineDebts = toEngineDebts(debts, settings.custom_order);
    const params = {
      debts: engineDebts,
      extraPaymentMinor: settings.extra_payment_minor,
      startMonth: settings.start_month,
      startYear: settings.start_year
    };

    const selected = DebtEngine.run({ ...params, strategy: settings.strategy });
    const comparison = DebtEngine.compareStrategies({
      ...params,
      strategies: ['avalanche', 'snowball', 'highest_payment', 'lowest_interest', 'custom', 'minimum']
    });
    const insights = DebtEngine.generateInsights({
      debts: engineDebts,
      selected,
      comparison,
      extraPaymentMinor: settings.extra_payment_minor
    });

    const totalBalanceMinor = engineDebts.reduce((s, d) => s + d.balanceMinor, 0);
    const monthlyPaymentsMinor = engineDebts.reduce((s, d) => s + Math.max(d.minimumPaymentMinor, d.monthlyPaymentMinor), 0) + settings.extra_payment_minor;
    const weightedApr =
      totalBalanceMinor > 0
        ? engineDebts.reduce((s, d) => s + d.aprPercent * d.balanceMinor, 0) / totalBalanceMinor
        : 0;

    const minimum = comparison.minimumBaseline;
    const projectedSavingsMinor = Math.max(0, minimum.totalPaidMinor - selected.totalPaidMinor);

    return {
      engineDebts,
      selected,
      comparison,
      insights,
      overview: {
        currentBalanceMinor: totalBalanceMinor,
        monthlyPaymentsMinor,
        totalInterestRemainingMinor: selected.totalInterestMinor,
        debtFreeDate: selected.debtFreeDate,
        monthsRemaining: selected.monthsToPayoff,
        averageInterestRate: weightedApr,
        interestSavedMinor: selected.interestSavedMinor,
        projectedSavingsMinor
      }
    };
  }, [debts, settings]);
}

export function strategyFingerprint(settings: DebtSimulationSettings, debts: DebtAccount[]): string {
  return [
    settings.strategy,
    settings.extra_payment_minor,
    settings.start_month,
    settings.start_year,
    settings.custom_order.join(','),
    debts.map((d) => `${d.id}:${d.balance_minor}:${d.apr_percent}:${d.minimum_payment_minor}:${d.monthly_payment_minor}:${d.status}`).join('|')
  ].join('::');
}

export type SimulationBundle = ReturnType<typeof useDebtSimulation>;
export type { DebtStrategy };
