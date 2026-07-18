import { formatCurrency } from '@/core/utils/currency';
import { fromMinor } from '@/core/debt';
import { selectCashFlow, selectExpense, selectIncome } from '@/core/ledger/selectors';
import { PaymentEngine } from '@/core/recurring';
import { AccountsRepository } from '@/data/repositories/AccountsRepository';
import { DebtsRepository } from '@/data/repositories/DebtsRepository';
import { RecurringRepository } from '@/data/repositories/RecurringRepository';
import { TransactionsRepository } from '@/data/repositories/TransactionsRepository';
import { getMonthWindow } from '@/features/transactions-workspace/monthlyFinance';
import { format } from 'date-fns';

export type AssistantDataSnapshot = {
  currency: string;
  accountCount: number;
  totalBalance: number;
  accounts: Array<{ name: string; balance: number }>;
  monthLabel: string;
  income: number;
  expenses: number;
  netCash: number;
  transactionCount: number;
  debtCount: number;
  totalDebt: number;
  monthlyDebtPayment: number;
  activeRecurring: number;
  upcomingPayments: Array<{ name: string; date: string; amount: number; status: string }>;
  overduePayments: Array<{ name: string; date: string; amount: number }>;
  monthlyRecurringExpense: number;
  monthlyRecurringIncome: number;
};

export const AssistantRepository = {
  async getSnapshot(householdId: string, userId: string, currency: string): Promise<AssistantDataSnapshot> {
    const month = getMonthWindow(new Date());

    const [accounts, transactions, debtState, rules] = await Promise.all([
      AccountsRepository.list().catch(() => []),
      TransactionsRepository.listByPeriod(month.start, month.end).catch(() => []),
      DebtsRepository.getState(householdId, userId).catch(() => null),
      RecurringRepository.listRules().catch(() => [])
    ]);

    const instances = await RecurringRepository.ensureHorizon(householdId, rules, 2).catch(() => []);
    const stats = PaymentEngine.computeRecurringStats(rules, instances);
    const today = format(new Date(), 'yyyy-MM-dd');
    const in14 = format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd');

    const upcomingPayments = instances
      .filter((i) => (i.status === 'pending' || i.status === 'overdue') && i.scheduled_date >= today && i.scheduled_date <= in14)
      .slice(0, 8)
      .map((i) => ({ name: i.name, date: i.scheduled_date, amount: i.amount, status: i.status }));

    const overduePayments = instances
      .filter((i) => i.status === 'overdue')
      .slice(0, 8)
      .map((i) => ({ name: i.name, date: i.scheduled_date, amount: i.amount }));

    const debts = debtState?.debts?.filter((d) => !d.deleted_at && d.status === 'active') ?? [];
    const totalDebt = debts.reduce((s, d) => s + fromMinor(d.balance_minor), 0);
    const monthlyDebtPayment = debts.reduce((s, d) => s + fromMinor(d.monthly_payment_minor || d.minimum_payment_minor), 0);

    return {
      currency,
      accountCount: accounts.length,
      totalBalance: accounts.reduce((s, a) => s + (a.balance ?? 0), 0),
      accounts: accounts.slice(0, 8).map((a) => ({ name: a.name, balance: a.balance ?? 0 })),
      monthLabel: month.label,
      income: selectIncome(transactions),
      expenses: selectExpense(transactions),
      netCash: selectCashFlow(transactions),
      transactionCount: transactions.length,
      debtCount: debts.length,
      totalDebt,
      monthlyDebtPayment,
      activeRecurring: stats.totalCount,
      upcomingPayments,
      overduePayments,
      monthlyRecurringExpense: stats.monthlyExpense,
      monthlyRecurringIncome: stats.monthlyIncome
    };
  },

  formatMoney(amount: number, currency: string) {
    return formatCurrency(amount, currency);
  }
};
