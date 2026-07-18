import { format, subMonths, startOfMonth, endOfMonth, addMonths, setDate, isBefore, isAfter, differenceInCalendarDays } from 'date-fns';
import { AccountsRepository } from './AccountsRepository';
import { CategoriesRepository } from './CategoriesRepository';
import { TransactionsRepository } from './TransactionsRepository';
import { RecurringRepository } from './RecurringRepository';
import { DebtsRepository } from './DebtsRepository';
import { buildMonthlyWorkspaceModel, getMonthWindow } from '@/features/transactions-workspace/monthlyFinance';
import { selectCashFlow, selectExpense, selectIncome } from '@/core/ledger/selectors';
import { fromMinor } from '@/core/debt';
import type { Account, Category, Transaction } from '@/types/finance';
import type { DebtAccount, DebtSimulationSettings } from '@/types/debt';
import type { Bill, ExpectedTransaction, RecurringRule } from '@/types/database';

export type DashboardRawPayload = {
  accounts: Account[];
  categories: Category[];
  currentTransactions: Transaction[];
  previousTransactions: Transaction[];
  historyTransactions: Transaction[];
  debts: DebtAccount[];
  debtSettings: DebtSimulationSettings | null;
  bills: Bill[];
  rules: RecurringRule[];
  expected: ExpectedTransaction[];
  monthLabel: string;
  monthStart: string;
  monthEnd: string;
};

/**
 * Single dashboard load — parallel fetches, one React Query entry.
 */
export const DashboardRepository = {
  async getSummary(householdId: string, userId: string): Promise<DashboardRawPayload> {
    const month = getMonthWindow(new Date());
    const historyStart = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
    const historyEnd = month.end;

    const [accounts, categories, currentTransactions, previousTransactions, historyTransactions, debtState, bills, rules, expected] =
      await Promise.all([
        AccountsRepository.list().catch(() => [] as Account[]),
        CategoriesRepository.list().catch(() => [] as Category[]),
        TransactionsRepository.listByPeriod(month.start, month.end).catch(() => [] as Transaction[]),
        TransactionsRepository.listByPeriod(month.previousStart, month.previousEnd).catch(() => [] as Transaction[]),
        TransactionsRepository.listByPeriod(historyStart, historyEnd).catch(() => [] as Transaction[]),
        DebtsRepository.getState(householdId, userId).catch(() => null),
        RecurringRepository.listBills().catch(() => [] as Bill[]),
        RecurringRepository.listRules().catch(() => [] as RecurringRule[]),
        RecurringRepository.listExpected().catch(() => [] as ExpectedTransaction[])
      ]);

    return {
      accounts,
      categories,
      currentTransactions,
      previousTransactions,
      historyTransactions,
      debts: debtState?.debts ?? [],
      debtSettings: debtState?.settings ?? null,
      bills,
      rules,
      expected,
      monthLabel: month.label,
      monthStart: month.start,
      monthEnd: month.end
    };
  }
};

export function monthlyTotalsFromHistory(transactions: Transaction[], monthsBack = 6) {
  const now = new Date();
  const rows: Array<{ label: string; income: number; expenses: number; net: number; key: string }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const anchor = subMonths(now, i);
    const start = format(startOfMonth(anchor), 'yyyy-MM-dd');
    const end = format(endOfMonth(anchor), 'yyyy-MM-dd');
    const slice = transactions.filter((t) => t.date >= start && t.date <= end);
    const income = selectIncome(slice);
    const expenses = selectExpense(slice);
    rows.push({
      key: format(anchor, 'yyyy-MM'),
      label: format(anchor, 'MMM'),
      income,
      expenses,
      net: selectCashFlow(slice)
    });
  }
  return rows;
}

export function buildUpcomingItems(input: {
  bills: Bill[];
  rules: RecurringRule[];
  expected: ExpectedTransaction[];
  limit?: number;
}) {
  const today = new Date();
  const items: Array<{
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    dueLabel: string;
    kind: 'bill' | 'income' | 'subscription' | 'payment';
    daysUntil: number;
  }> = [];

  for (const bill of input.bills) {
    if (!bill.due_day) continue;
    let due = setDate(startOfMonth(today), Math.min(bill.due_day, 28));
    if (isBefore(due, today)) due = setDate(startOfMonth(addMonths(today, 1)), Math.min(bill.due_day, 28));
    const daysUntil = differenceInCalendarDays(due, today);
    items.push({
      id: `bill-${bill.id}`,
      title: bill.name,
      amount: bill.amount ?? 0,
      dueDate: format(due, 'yyyy-MM-dd'),
      dueLabel: format(due, 'MMM d'),
      kind: 'bill',
      daysUntil
    });
  }

  for (const rule of input.rules.filter((r) => r.status === 'active')) {
    const dueStr = rule.next_occurrence_on;
    if (!dueStr) continue;
    const due = new Date(dueStr);
    if (isAfter(due, addMonths(today, 2))) continue;
    const daysUntil = differenceInCalendarDays(due, today);
    items.push({
      id: `rule-${rule.id}`,
      title: rule.name,
      amount: rule.amount ?? 0,
      dueDate: dueStr,
      dueLabel: format(due, 'MMM d'),
      kind: rule.transaction_type === 'income' ? 'income' : 'subscription',
      daysUntil
    });
  }

  for (const exp of input.expected.filter((e) => e.status === 'scheduled')) {
    const due = new Date(exp.expected_date);
    const daysUntil = differenceInCalendarDays(due, today);
    if (daysUntil < -1 || daysUntil > 60) continue;
    items.push({
      id: `exp-${exp.id}`,
      title: exp.name || 'Expected payment',
      amount: exp.expected_amount,
      dueDate: exp.expected_date,
      dueLabel: format(due, 'MMM d'),
      kind: 'payment',
      daysUntil
    });
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, input.limit ?? 8);
}

export function liquidCash(accounts: Account[]): number {
  const liquid = new Set(['checking', 'savings', 'wallet', 'cash']);
  return accounts.filter((a) => !a.is_archived && !a.deleted_at && liquid.has(a.type)).reduce((s, a) => s + (a.balance || a.opening_balance || 0), 0);
}

export function investmentBreakdown(accounts: Account[]) {
  const invest = accounts.filter((a) => !a.is_archived && !a.deleted_at && (a.type === 'investment' || a.type === 'crypto'));
  const total = invest.reduce((s, a) => s + (a.balance || a.opening_balance || 0), 0);
  const stocks = invest.filter((a) => a.type === 'investment').reduce((s, a) => s + (a.balance || a.opening_balance || 0), 0);
  const crypto = invest.filter((a) => a.type === 'crypto').reduce((s, a) => s + (a.balance || a.opening_balance || 0), 0);
  const cashSleeve = total * 0.05;
  return {
    total,
    allocation: [
      { name: 'Stocks / ETF', value: Math.max(0, stocks - cashSleeve), color: 'var(--color-accent-teal)' },
      { name: 'Crypto', value: crypto, color: 'var(--color-accent-purple)' },
      { name: 'Cash sleeve', value: cashSleeve, color: 'var(--color-accent-green)' }
    ].filter((a) => a.value > 0)
  };
}

export function totalDebtMajor(debts: DebtAccount[]): number {
  return debts.filter((d) => d.status === 'active' && !d.deleted_at).reduce((s, d) => s + fromMinor(d.balance_minor), 0);
}

export { buildMonthlyWorkspaceModel, getMonthWindow };
