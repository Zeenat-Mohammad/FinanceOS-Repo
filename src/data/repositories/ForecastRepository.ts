import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { TransactionsRepository } from './TransactionsRepository';
import { RecurringRepository } from './RecurringRepository';
import { DebtsRepository } from './DebtsRepository';
import { AccountsRepository } from './AccountsRepository';
import { GoalsRepository } from './GoalsRepository';
import { selectIncome, selectExpense, selectCashFlow } from '@/core/ledger/selectors';
import { DebtEngine, fromMinor } from '@/core/debt';
import { toEngineDebts } from '@/features/debt/useDebtSimulation';
import type { HistoricalMonth, ForecastHorizon } from '@/core/forecast';
import { formatMonthLabel } from '@/core/forecast';
import type { Account, Transaction } from '@/types/finance';

export type ForecastDataPayload = {
  history: HistoricalMonth[];
  debtProjection: { label: string; balance: number; year: number; month: number }[];
  debtFreeDate: string | null;
  startingCashBalance: number;
  startingNetWorth: number;
  recurringIncomeMonthly: number;
  recurringExpenseMonthly: number;
  goals: Array<{ id: string; name: string; target: number; current: number; monthlyContribution: number }>;
};

function monthKey(year: number, month: number) {
  return `${year}-${month}`;
}

function aggregateMonth(
  transactions: Transaction[],
  year: number,
  month: number,
  priorCash: number,
  priorSavings: number,
  priorInvest: number,
  debtBalance: number
): HistoricalMonth {
  const income = selectIncome(transactions);
  const expenses = selectExpense(transactions);
  const cashFlow = selectCashFlow(transactions);
  const savingsContribution = Math.max(0, cashFlow * 0.25);
  const investContribution = Math.max(0, cashFlow * 0.15);
  const savings = priorSavings + savingsContribution;
  const investments = priorInvest + investContribution;
  const cashBalance = priorCash + cashFlow;

  return {
    year,
    month,
    label: formatMonthLabel(year, month),
    income,
    expenses,
    savings,
    investments,
    cashFlow,
    cashBalance,
    debtBalance,
    netWorth: cashBalance + savings + investments - debtBalance
  };
}

export const ForecastRepository = {
  async loadHistory(householdId: string, userId: string, lookbackMonths = 18): Promise<ForecastDataPayload> {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(end, lookbackMonths - 1));

    let transactions: Transaction[] = [];
    try {
      transactions = await TransactionsRepository.listByPeriod(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    } catch {
      transactions = [];
    }

    let accounts: Account[] = [];
    try {
      accounts = await AccountsRepository.list();
    } catch {
      accounts = [];
    }

    let recurringIncomeMonthly = 0;
    let recurringExpenseMonthly = 0;
    try {
      const rules = await RecurringRepository.listRules();
      for (const rule of rules.filter((r) => r.status === 'active')) {
        const amount = rule.amount ?? 0;
        const monthly =
          rule.cadence === 'monthly'
            ? amount
            : rule.cadence === 'weekly'
              ? amount * 4.33
              : rule.cadence === 'biweekly'
                ? amount * 2.17
                : rule.cadence === 'annual'
                  ? amount / 12
                  : amount;
        if (rule.transaction_type === 'income') recurringIncomeMonthly += monthly;
        if (rule.transaction_type === 'expense') recurringExpenseMonthly += monthly;
      }
    } catch {
      /* optional */
    }

    let goals: ForecastDataPayload['goals'] = [];
    try {
      goals = (await GoalsRepository.list(householdId))
        .filter((goal) => ['active', 'paused'].includes(goal.status))
        .map((goal) => ({
          id: goal.id,
          name: goal.name,
          target: goal.target_amount,
          current: goal.current_amount,
          monthlyContribution: goal.expected_monthly_contribution
        }));
    } catch {
      goals = [];
    }

    let debtState = null;
    try {
      debtState = await DebtsRepository.getState(householdId, userId);
    } catch {
      debtState = null;
    }

    const activeDebts = (debtState?.debts ?? []).filter((d) => d.status === 'active' && !d.deleted_at);
    const totalDebtMajor = activeDebts.reduce((s, d) => s + fromMinor(d.balance_minor), 0);

    let debtProjection: ForecastDataPayload['debtProjection'] = [];
    let debtFreeDate: string | null = null;
    if (activeDebts.length > 0 && debtState) {
      const engineDebts = toEngineDebts(activeDebts, debtState.settings.custom_order);
      const result = DebtEngine.run({
        debts: engineDebts,
        strategy: debtState.settings.strategy,
        extraPaymentMinor: debtState.settings.extra_payment_minor,
        startMonth: debtState.settings.start_month,
        startYear: debtState.settings.start_year
      });
      debtFreeDate = result.debtFreeDate?.label ?? null;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      debtProjection = result.monthlyBalances.map((row) => {
        const [mon, yearStr] = row.label.split(' ');
        return {
          label: row.label,
          balance: fromMinor(row.balanceMinor),
          year: Number(yearStr),
          month: monthNames.indexOf(mon)
        };
      });
    }

    const byMonth = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = monthKey(d.getFullYear(), d.getMonth());
      const list = byMonth.get(key) ?? [];
      list.push(tx);
      byMonth.set(key, list);
    }

    const liquidTypes = new Set(['checking', 'savings', 'wallet', 'cash']);
    const investTypes = new Set(['investment', 'crypto']);
    const startingCashBalance = accounts
      .filter((a) => !a.is_archived && liquidTypes.has(a.type))
      .reduce((s, a) => s + (a.balance || a.opening_balance || 0), 0);
    const startingInvest = accounts
      .filter((a) => !a.is_archived && investTypes.has(a.type))
      .reduce((s, a) => s + (a.balance || a.opening_balance || 0), 0);

    const history: HistoricalMonth[] = [];
    let cash = startingCashBalance;
    let savings = 0;
    let investments = startingInvest;
    let debtCursor = totalDebtMajor;

    for (let i = lookbackMonths - 1; i >= 0; i--) {
      const cursor = subMonths(end, i);
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const key = monthKey(year, month);
      const monthTx = byMonth.get(key) ?? [];

      if (monthTx.length > 0) {
        const row = aggregateMonth(monthTx, year, month, cash, savings, investments, debtCursor);
        cash = row.cashBalance;
        savings = row.savings;
        investments = row.investments;
        debtCursor = Math.max(0, debtCursor - Math.max(0, row.cashFlow * 0.15));
        history.push({
          ...row,
          debtBalance: debtCursor,
          netWorth: row.cashBalance + row.savings + row.investments - debtCursor
        });
      } else if (i === 0) {
        history.push({
          year,
          month,
          label: formatMonthLabel(year, month),
          income: 0,
          expenses: 0,
          savings,
          investments,
          cashFlow: 0,
          cashBalance: cash,
          debtBalance: debtCursor,
          netWorth: cash + savings + investments - debtCursor
        });
      }
    }

    const last = history.at(-1);
    return {
      history,
      debtProjection,
      debtFreeDate,
      startingCashBalance: last?.cashBalance ?? startingCashBalance,
      startingNetWorth: last?.netWorth ?? startingCashBalance + startingInvest - totalDebtMajor,
      recurringIncomeMonthly,
      recurringExpenseMonthly,
      goals
    };
  },

  cacheKey(householdId: string, horizon: ForecastHorizon, scenario: string, whatIfs: string[]) {
    return `finlo.forecast.${householdId}.${horizon}.${scenario}.${whatIfs.slice().sort().join(',')}`;
  }
};
