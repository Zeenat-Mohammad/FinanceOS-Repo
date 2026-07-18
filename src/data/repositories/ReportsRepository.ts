import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subYears } from 'date-fns';
import { AccountsRepository } from './AccountsRepository';
import { CategoriesRepository } from './CategoriesRepository';
import { TransactionsRepository } from './TransactionsRepository';
import { selectCashFlow, selectExpense, selectIncome } from '@/core/ledger/selectors';
import type { Category, Transaction } from '@/types/finance';

export type PaperSize = 'a4' | 'letter' | 'a3';

export type MonthlyReportSummary = {
  year: number;
  month: number; // 1-12
  key: string; // yyyy-MM
  label: string; // July 2026
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  hasData: boolean;
};

export type CategoryBreakdownRow = {
  id: string;
  name: string;
  amount: number;
  share: number;
};

export type MonthlyReportDetail = MonthlyReportSummary & {
  currency: string;
  householdName: string;
  generatedAt: string;
  topExpenses: Array<{ date: string; name: string; amount: number; category: string }>;
  topIncome: Array<{ date: string; name: string; amount: number; category: string }>;
  categories: CategoryBreakdownRow[];
  accounts: Array<{ name: string; inflow: number; outflow: number; net: number }>;
};

function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export const ReportsRepository = {
  async listYears(): Promise<number[]> {
    const now = new Date().getFullYear();
    const years = new Set<number>([now, now - 1, now - 2]);

    try {
      const start = format(startOfYear(subYears(new Date(), 5)), 'yyyy-MM-dd');
      const end = format(endOfYear(new Date()), 'yyyy-MM-dd');
      const transactions = await TransactionsRepository.listByPeriod(start, end);
      for (const tx of transactions) {
        if (tx.date) years.add(Number(tx.date.slice(0, 4)));
      }
    } catch {
      // keep default recent years
    }

    return [...years].sort((a, b) => b - a);
  },

  async listMonthsForYear(year: number, currency: string): Promise<MonthlyReportSummary[]> {
    const start = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
    const end = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
    const transactions = await TransactionsRepository.listByPeriod(start, end).catch(() => [] as Transaction[]);

    const now = new Date();
    const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
    // Always show full year months for past years; current year through this month
    const months: MonthlyReportSummary[] = [];

    for (let month = 1; month <= 12; month += 1) {
      if (year === now.getFullYear() && month > maxMonth) continue;
      // Also include future months in year only if they have data (rare)
      const key = monthKey(year, month);
      const slice = transactions.filter((t) => t.date.startsWith(key));
      const income = selectIncome(slice);
      const expenses = selectExpense(slice);
      months.push({
        year,
        month,
        key,
        label: monthLabel(year, month),
        income,
        expenses,
        net: selectCashFlow(slice),
        transactionCount: slice.length,
        hasData: slice.length > 0
      });
    }

    // If empty year with no activity, still return months up to current for UX
    if (months.length === 0) {
      for (let month = 1; month <= maxMonth; month += 1) {
        months.push({
          year,
          month,
          key: monthKey(year, month),
          label: monthLabel(year, month),
          income: 0,
          expenses: 0,
          net: 0,
          transactionCount: 0,
          hasData: false
        });
      }
    }

    void currency;
    return months.reverse(); // newest first
  },

  async getMonthlyDetail(params: {
    year: number;
    month: number;
    currency: string;
    householdName: string;
  }): Promise<MonthlyReportDetail> {
    const { year, month, currency, householdName } = params;
    const anchor = new Date(year, month - 1, 1);
    const start = format(startOfMonth(anchor), 'yyyy-MM-dd');
    const end = format(endOfMonth(anchor), 'yyyy-MM-dd');

    const [transactions, categories, accounts] = await Promise.all([
      TransactionsRepository.listByPeriod(start, end).catch(() => [] as Transaction[]),
      CategoriesRepository.list().catch(() => [] as Category[]),
      AccountsRepository.list().catch(() => [])
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    const income = selectIncome(transactions);
    const expenses = selectExpense(transactions);
    const expenseByCategory = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.deleted_at) continue;
      const id = tx.category_id ?? 'uncategorized';
      expenseByCategory.set(id, (expenseByCategory.get(id) ?? 0) + tx.amount);
    }

    const categoryRows: CategoryBreakdownRow[] = [...expenseByCategory.entries()]
      .map(([id, amount]) => ({
        id,
        name: id === 'uncategorized' ? 'Uncategorized' : categoryMap.get(id) ?? 'Unknown',
        amount,
        share: expenses > 0 ? amount / expenses : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const topExpenses = transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map((t) => ({
        date: t.date,
        name: t.merchant || t.description || 'Expense',
        amount: t.amount,
        category: t.category_id ? categoryMap.get(t.category_id) ?? '—' : '—'
      }));

    const topIncome = transactions
      .filter((t) => t.type === 'income')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map((t) => ({
        date: t.date,
        name: t.merchant || t.description || 'Income',
        amount: t.amount,
        category: t.category_id ? categoryMap.get(t.category_id) ?? '—' : '—'
      }));

    const accountAgg = new Map<string, { inflow: number; outflow: number }>();
    for (const tx of transactions) {
      const row = accountAgg.get(tx.account_id) ?? { inflow: 0, outflow: 0 };
      if (tx.type === 'income' || tx.type === 'refund') row.inflow += tx.amount;
      else if (tx.type === 'expense') row.outflow += tx.amount;
      accountAgg.set(tx.account_id, row);
    }

    const accountRows = [...accountAgg.entries()].map(([id, row]) => ({
      name: accountMap.get(id) ?? 'Account',
      inflow: row.inflow,
      outflow: row.outflow,
      net: row.inflow - row.outflow
    }));

    return {
      year,
      month,
      key: monthKey(year, month),
      label: monthLabel(year, month),
      income,
      expenses,
      net: selectCashFlow(transactions),
      transactionCount: transactions.length,
      hasData: transactions.length > 0,
      currency,
      householdName,
      generatedAt: new Date().toISOString(),
      topExpenses,
      topIncome,
      categories: categoryRows,
      accounts: accountRows
    };
  }
};
