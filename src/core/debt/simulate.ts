import { addMonths, calculateInterest, formatMonthLabel } from './money';
import { orderDebtsByStrategy } from './strategies';
import type {
  AmortizationMonth,
  DebtMonthBreakdown,
  DebtStrategy,
  EngineDebt,
  SimulationParams,
  StrategyResult,
  TimelineEvent
} from './types';

type WorkingDebt = EngineDebt & {
  remainingMinor: number;
  rolledPaymentMinor: number;
};

/**
 * Core month-by-month payoff simulator.
 *
 * Each month for every active debt:
 * 1. Accrue interest = balance × (APR / 12)
 * 2. Apply minimum payment (or current monthly payment floor)
 * 3. Apply strategy extra + rolled payments to the target debt
 * 4. Reduce principal; when a debt hits zero, roll its payment into the next target
 */
export function simulatePayoff(params: SimulationParams): StrategyResult {
  const maxMonths = params.maxMonths ?? 600;
  const extraBudget = params.strategy === 'minimum' ? 0 : Math.max(0, params.extraPaymentMinor);

  const working: WorkingDebt[] = params.debts
    .filter((d) => d.balanceMinor > 0)
    .map((d) => ({
      ...d,
      remainingMinor: d.balanceMinor,
      rolledPaymentMinor: 0,
      monthlyPaymentMinor: Math.max(d.monthlyPaymentMinor, d.minimumPaymentMinor)
    }));

  if (working.length === 0) {
    return emptyResult(params.strategy, params.startYear, params.startMonth);
  }

  const schedule: AmortizationMonth[] = [];
  const timeline: TimelineEvent[] = [
    {
      monthIndex: 0,
      year: params.startYear,
      month: params.startMonth,
      label: formatMonthLabel(params.startYear, params.startMonth),
      debtId: null,
      debtName: 'Start',
      kind: 'start'
    }
  ];

  const payoffOrder: string[] = [];
  const debtPayoffMonths: Record<string, number> = {};
  let totalInterestMinor = 0;
  let totalPaidMinor = 0;
  let monthIndex = 0;

  while (working.some((d) => d.remainingMinor > 0) && monthIndex < maxMonths) {
    const { year, month } = addMonths(params.startYear, params.startMonth, monthIndex);
    const startingBalanceMinor = working.reduce((sum, d) => sum + d.remainingMinor, 0);

    const priority = orderDebtsByStrategy(
      working.map((d) => ({ ...d, balanceMinor: d.remainingMinor })),
      params.strategy
    );

    const targetId = params.strategy === 'minimum' ? null : priority.find((id) => {
      const debt = working.find((d) => d.id === id);
      return debt && debt.remainingMinor > 0 && debt.extraPaymentAllowed;
    }) ?? null;

    let remainingExtra = extraBudget;
    const breakdowns: DebtMonthBreakdown[] = [];
    let monthInterest = 0;
    let monthPrincipal = 0;
    let monthPayment = 0;
    let monthExtraApplied = 0;
    const newlyPaid: WorkingDebt[] = [];

    // First pass: compute interest and base (minimum) payments
    const planned = new Map<string, { interest: number; basePayment: number; extra: number }>();

    for (const debt of working) {
      if (debt.remainingMinor <= 0) {
        planned.set(debt.id, { interest: 0, basePayment: 0, extra: 0 });
        continue;
      }

      const interest = calculateInterest(debt.remainingMinor, debt.aprPercent);
      const balanceWithInterest = debt.remainingMinor + interest;
      const baseFloor = Math.max(debt.minimumPaymentMinor, Math.min(debt.monthlyPaymentMinor, balanceWithInterest));
      const basePayment = Math.min(baseFloor, balanceWithInterest);
      planned.set(debt.id, { interest, basePayment, extra: 0 });
    }

    // Second pass: allocate extra + rolled payments to target
    if (targetId) {
      const target = working.find((d) => d.id === targetId);
      const plan = planned.get(targetId);
      if (target && plan && target.remainingMinor > 0) {
        const interest = plan.interest;
        const balanceWithInterest = target.remainingMinor + interest;
        const afterBase = Math.max(0, balanceWithInterest - plan.basePayment);
        const rolled = target.rolledPaymentMinor;
        const availableExtra = remainingExtra + rolled;
        const extra = Math.min(availableExtra, afterBase);
        plan.extra = extra;
        monthExtraApplied = Math.min(remainingExtra, extra);
        remainingExtra = Math.max(0, remainingExtra - Math.max(0, extra - rolled));
      }
    }

    // Apply payments
    for (const debt of working) {
      const plan = planned.get(debt.id) ?? { interest: 0, basePayment: 0, extra: 0 };
      const interest = plan.interest;
      const payment = plan.basePayment + plan.extra;
      const principal = Math.max(0, payment - interest);
      const ending = Math.max(0, debt.remainingMinor + interest - payment);

      monthInterest += interest;
      monthPrincipal += principal;
      monthPayment += payment;
      totalInterestMinor += interest;
      totalPaidMinor += payment;

      debt.remainingMinor = ending;

      breakdowns.push({
        debtId: debt.id,
        paymentMinor: payment,
        interestMinor: interest,
        principalMinor: principal,
        endingBalanceMinor: ending
      });

      if (ending === 0 && debt.balanceMinor > 0 && !(debt.id in debtPayoffMonths)) {
        newlyPaid.push(debt);
      }
    }

    // Roll paid-off debt payments into next target
    for (const paid of newlyPaid) {
      debtPayoffMonths[paid.id] = monthIndex;
      payoffOrder.push(paid.id);
      const freed = Math.max(paid.minimumPaymentMinor, paid.monthlyPaymentMinor) + paid.rolledPaymentMinor;
      paid.rolledPaymentMinor = 0;

      const nextTarget = orderDebtsByStrategy(
        working.map((d) => ({ ...d, balanceMinor: d.remainingMinor })),
        params.strategy
      ).find((id) => {
        const d = working.find((x) => x.id === id);
        return d && d.remainingMinor > 0 && d.extraPaymentAllowed && d.id !== paid.id;
      });

      if (nextTarget) {
        const next = working.find((d) => d.id === nextTarget);
        if (next) next.rolledPaymentMinor += freed;
      }

      const { year: py, month: pm } = addMonths(params.startYear, params.startMonth, monthIndex);
      timeline.push({
        monthIndex,
        year: py,
        month: pm,
        label: formatMonthLabel(py, pm),
        debtId: paid.id,
        debtName: paid.name,
        kind: 'paid_off'
      });
    }

    const endingBalanceMinor = working.reduce((sum, d) => sum + d.remainingMinor, 0);

    schedule.push({
      monthIndex,
      year,
      month,
      label: formatMonthLabel(year, month),
      startingBalanceMinor,
      totalPaymentMinor: monthPayment,
      totalPrincipalMinor: monthPrincipal,
      totalInterestMinor: monthInterest,
      extraPaymentMinor: monthExtraApplied,
      endingBalanceMinor,
      debts: breakdowns
    });

    // Guard: if no principal progress and no balances changing, break
    if (monthPrincipal <= 0 && endingBalanceMinor >= startingBalanceMinor) {
      break;
    }

    monthIndex += 1;
  }

  const monthsToPayoff = working.every((d) => d.remainingMinor <= 0) ? monthIndex : monthIndex;
  const debtFree =
    working.every((d) => d.remainingMinor <= 0) && monthsToPayoff > 0
      ? addMonths(params.startYear, params.startMonth, monthsToPayoff - 1)
      : null;

  if (debtFree) {
    timeline.push({
      monthIndex: monthsToPayoff - 1,
      year: debtFree.year,
      month: debtFree.month,
      label: formatMonthLabel(debtFree.year, debtFree.month),
      debtId: null,
      debtName: 'All Debt Paid Off',
      kind: 'all_clear'
    });
  }

  return {
    strategy: params.strategy,
    monthsToPayoff: working.every((d) => d.remainingMinor <= 0) ? monthsToPayoff : -1,
    debtFreeDate: debtFree
      ? { year: debtFree.year, month: debtFree.month, label: formatMonthLabel(debtFree.year, debtFree.month) }
      : null,
    totalInterestMinor,
    totalPaidMinor,
    interestSavedMinor: 0,
    payoffOrder,
    schedule,
    timeline,
    monthlyBalances: schedule.map((row) => ({
      monthIndex: row.monthIndex,
      label: row.label,
      balanceMinor: row.endingBalanceMinor,
      paymentMinor: row.totalPaymentMinor
    })),
    debtPayoffMonths
  };
}

function emptyResult(strategy: DebtStrategy, startYear: number, startMonth: number): StrategyResult {
  return {
    strategy,
    monthsToPayoff: 0,
    debtFreeDate: { year: startYear, month: startMonth, label: formatMonthLabel(startYear, startMonth) },
    totalInterestMinor: 0,
    totalPaidMinor: 0,
    interestSavedMinor: 0,
    payoffOrder: [],
    schedule: [],
    timeline: [
      {
        monthIndex: 0,
        year: startYear,
        month: startMonth,
        label: formatMonthLabel(startYear, startMonth),
        debtId: null,
        debtName: 'Start',
        kind: 'start'
      }
    ],
    monthlyBalances: [],
    debtPayoffMonths: {}
  };
}

export function cloneDebts(debts: EngineDebt[]): EngineDebt[] {
  return debts.map((d) => ({ ...d }));
}
