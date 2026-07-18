import {
  addDays,
  endOfMonth,
  format,
  getDate,
  getDay,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths
} from 'date-fns';
import type { Account, Category, Transaction } from '@/types/finance';
import { selectCashFlow, selectCategoryTotals, selectExpense, selectIncome, selectRefunds } from '@/core/ledger/selectors';

export type MonthStatus = 'current' | 'archived' | 'future';

export type MonthWindow = {
  anchor: Date;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  label: string;
  month: number;
  year: number;
  status: MonthStatus;
};

export type KPI = {
  id: string;
  label: string;
  value: number;
  format: 'currency' | 'percent' | 'number';
  previousValue: number;
  trend: number;
  sparkline: number[];
  tone: 'income' | 'expense' | 'savings' | 'budget' | 'neutral';
};

export type BudgetRow = {
  id: string;
  label: string;
  budget: number;
  actual: number;
  remaining: number;
  progress: number;
  status: 'healthy' | 'watch' | 'over';
};

export type FinanceInsight = {
  id: string;
  title: string;
  detail: string;
  tone: 'good' | 'warning' | 'info';
};

export type WorkspaceTransaction = Transaction & {
  merchantLabel: string;
  accountName: string;
  categoryName: string;
  signedAmount: number;
};

export type MonthlyWorkspaceModel = {
  current: Transaction[];
  previous: Transaction[];
  recent: WorkspaceTransaction[];
  kpis: KPI[];
  insights: FinanceInsight[];
  budgetRows: BudgetRow[];
  categoryBreakdown: Array<{ name: string; value: number; color: string }>;
  dailySeries: Array<{ date: string; income: number; expenses: number; net: number; spending: number }>;
  weeklySeries: Array<{ week: string; spending: number; income: number; savings: number }>;
  heatmap: Array<{ date: string; day: string; week: string; value: number; level: number }>;
  bills: Array<{ id: string; merchant: string; dueDate: string; budget: number; paid: number; remaining: number; priority: string; overdue: boolean }>;
  incomeCards: Array<{ id: string; source: string; expected: number; received: number; difference: number; depositAccount: string }>;
  subscriptions: Array<{ id: string; merchant: string; renewalDate: string; monthlyCost: number; category: string; upcoming: boolean }>;
  savings: Array<{ id: string; goal: string; current: number; contribution: number; forecast: number; progress: number }>;
};

const budgetGroups = ['Income', 'Bills', 'Subscriptions', 'Expenses', 'Savings', 'Debt', 'Investments', 'Goals'];
const subscriptionMerchants = ['netflix', 'spotify', 'adobe', 'apple', 'google', 'notion', 'figma', 'github', 'amazon prime', 'youtube'];
const billTerms = ['rent', 'mortgage', 'electricity', 'internet', 'insurance', 'phone', 'water', 'utility', 'bill'];
const savingsTerms = ['saving', 'emergency', 'vacation', 'house', 'education', 'retirement'];
const debtTerms = ['debt', 'loan', 'credit card', 'emi', 'minimum payment'];

export function getMonthWindow(anchor: Date, archivedMonths = new Set<string>()): MonthWindow {
  const startDate = startOfMonth(anchor);
  const endDate = endOfMonth(anchor);
  const previous = subMonths(anchor, 1);
  const now = new Date();
  const key = format(startDate, 'yyyy-MM');

  return {
    anchor: startDate,
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd'),
    previousStart: format(startOfMonth(previous), 'yyyy-MM-dd'),
    previousEnd: format(endOfMonth(previous), 'yyyy-MM-dd'),
    label: format(startDate, 'MMMM yyyy'),
    month: startDate.getMonth(),
    year: startDate.getFullYear(),
    status: archivedMonths.has(key) ? 'archived' : isAfter(startDate, endOfMonth(now)) ? 'future' : isSameMonth(startDate, now) ? 'current' : 'archived'
  };
}

export function monthKey(date: Date) {
  return format(startOfMonth(date), 'yyyy-MM');
}

export function buildMonthlyWorkspaceModel(input: {
  transactions: Transaction[];
  previousTransactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  month: MonthWindow;
}): MonthlyWorkspaceModel {
  const { transactions, previousTransactions, accounts, categories, month } = input;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const currentIncome = selectIncome(transactions);
  const currentExpenses = selectExpense(transactions);
  const currentRefunds = selectRefunds(transactions);
  const previousIncome = selectIncome(previousTransactions);
  const previousExpenses = selectExpense(previousTransactions);
  const currentCashFlow = selectCashFlow(transactions);
  const previousCashFlow = selectCashFlow(previousTransactions);
  const savingsTotal = deriveSavings(transactions, accountById, categoryById);
  const previousSavings = deriveSavings(previousTransactions, accountById, categoryById);
  const bills = deriveBills(transactions, categoryById);
  const subscriptions = deriveSubscriptions(transactions, categoryById);
  const budgetRows = deriveBudgetRows(transactions, previousTransactions, categoryById);
  const totalBudget = budgetRows.filter((row) => row.id !== 'Income').reduce((total, row) => total + row.budget, 0);
  const totalActual = budgetRows.filter((row) => row.id !== 'Income').reduce((total, row) => total + row.actual, 0);
  const budgetUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const dailySeries = deriveDailySeries(transactions, month);

  return {
    current: transactions,
    previous: previousTransactions,
    recent: transactions.slice(0, 10).map((transaction) => decorateTransaction(transaction, accountById, categoryById)),
    kpis: [
      makeKpi('income', 'Total Income', currentIncome + currentRefunds, previousIncome, 'currency', dailySeries.map((day) => day.income), 'income'),
      makeKpi('expenses', 'Total Expenses', currentExpenses, previousExpenses, 'currency', dailySeries.map((day) => day.expenses), 'expense'),
      makeKpi('savings', 'Savings', savingsTotal, previousSavings, 'currency', dailySeries.map((day) => day.net), 'savings'),
      makeKpi('cash-left', 'Cash Left', currentCashFlow - savingsTotal, previousCashFlow - previousSavings, 'currency', dailySeries.map((day) => day.net), 'neutral'),
      makeKpi('budget-used', 'Budget Used', budgetUsed, derivePreviousBudgetUsed(previousTransactions, categoryById), 'percent', budgetRows.map((row) => row.progress), 'budget'),
      makeKpi('bills-due', 'Bills Due', bills.filter((bill) => bill.remaining > 0).length, 0, 'number', bills.map((bill) => bill.remaining), 'expense'),
      makeKpi('net-cash-flow', 'Net Cash Flow', currentCashFlow, previousCashFlow, 'currency', dailySeries.map((day) => day.net), 'neutral'),
      makeKpi('savings-rate', 'Savings Rate', currentIncome > 0 ? (savingsTotal / currentIncome) * 100 : 0, previousIncome > 0 ? (previousSavings / previousIncome) * 100 : 0, 'percent', dailySeries.map((day) => day.net), 'savings')
    ],
    insights: deriveInsights({ transactions, previousTransactions, accounts, categories, bills, subscriptions, savingsTotal }),
    budgetRows,
    categoryBreakdown: deriveCategoryBreakdown(transactions, categoryById),
    dailySeries,
    weeklySeries: deriveWeeklySeries(transactions, month, accountById, categoryById),
    heatmap: deriveHeatmap(transactions, month),
    bills,
    incomeCards: deriveIncomeCards(transactions, previousTransactions, accountById),
    subscriptions,
    savings: deriveSavingsCards(transactions, accountById, categoryById, currentIncome)
  };
}

function makeKpi(id: string, label: string, value: number, previousValue: number, formatType: KPI['format'], sparkline: number[], tone: KPI['tone']): KPI {
  return {
    id,
    label,
    value,
    previousValue,
    format: formatType,
    trend: previousValue === 0 ? (value === 0 ? 0 : 100) : ((value - previousValue) / Math.abs(previousValue)) * 100,
    sparkline: sparkline.length > 0 ? sparkline : [0],
    tone
  };
}

function signedAmount(transaction: Transaction): number {
  if (transaction.deleted_at || transaction.soft_delete || transaction.status === 'void') return 0;
  if (transaction.type === 'income' || transaction.type === 'refund' || transaction.type === 'opening_balance') return transaction.amount;
  if (transaction.type === 'expense') return -transaction.amount;
  if (transaction.type === 'transfer') return metadataValue(transaction, 'direction') === 'incoming' ? transaction.amount : -transaction.amount;
  return transaction.amount;
}

function metadataValue(transaction: Transaction, key: string) {
  const metadata = transaction.metadata;
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata[key] : undefined;
}

function decorateTransaction(transaction: Transaction, accountById: Map<string, Account>, categoryById: Map<string, Category>): WorkspaceTransaction {
  const account = accountById.get(transaction.account_id);
  const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
  return {
    ...transaction,
    merchantLabel: transaction.merchant || transaction.description || category?.name || 'Ledger entry',
    accountName: account?.name ?? 'Unknown account',
    categoryName: category?.name ?? titleCase(transaction.type),
    signedAmount: signedAmount(transaction)
  };
}

function deriveDailySeries(transactions: Transaction[], month: MonthWindow) {
  const days = getDate(parseISO(month.end));
  return Array.from({ length: days }, (_, index) => {
    const date = format(addDays(parseISO(month.start), index), 'yyyy-MM-dd');
    const dayTransactions = transactions.filter((transaction) => transaction.date === date);
    const income = selectIncome(dayTransactions) + selectRefunds(dayTransactions);
    const expenses = selectExpense(dayTransactions);
    return {
      date: format(parseISO(date), 'MMM d'),
      income,
      expenses,
      spending: expenses,
      net: income - expenses
    };
  });
}

function deriveWeeklySeries(transactions: Transaction[], month: MonthWindow, accountById: Map<string, Account>, categoryById: Map<string, Category>) {
  return [1, 2, 3, 4, 5].map((week) => {
    const weekTransactions = transactions.filter((transaction) => Math.ceil(getDate(parseISO(transaction.date)) / 7) === week);
    return {
      week: `Week ${week}`,
      spending: selectExpense(weekTransactions),
      income: selectIncome(weekTransactions),
      savings: deriveSavings(weekTransactions, accountById, categoryById)
    };
  }).filter((row) => row.spending > 0 || row.income > 0 || row.savings > 0 || month.status !== 'future');
}

function deriveHeatmap(transactions: Transaction[], month: MonthWindow) {
  const maxSpend = Math.max(1, ...transactions.map((transaction) => (transaction.type === 'expense' ? transaction.amount : 0)));
  const days = getDate(parseISO(month.end));

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(parseISO(month.start), index);
    const daySpend = transactions.filter((transaction) => transaction.type === 'expense' && transaction.date === format(date, 'yyyy-MM-dd')).reduce((total, transaction) => total + transaction.amount, 0);
    return {
      date: format(date, 'yyyy-MM-dd'),
      day: format(date, 'EEE'),
      week: `Week ${Math.ceil(getDate(date) / 7)}`,
      value: daySpend,
      level: Math.min(4, Math.ceil((daySpend / maxSpend) * 4)),
      dayIndex: getDay(date)
    };
  });
}

function deriveCategoryBreakdown(transactions: Transaction[], categoryById: Map<string, Category>) {
  const totals = selectCategoryTotals(transactions.filter((transaction) => transaction.type === 'expense'));
  return Object.entries(totals)
    .map(([categoryId, value]) => {
      const category = categoryById.get(categoryId);
      return { name: category?.name ?? 'Uncategorized', value, color: category?.color ?? 'var(--color-accent-teal)' };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function deriveBudgetRows(transactions: Transaction[], previousTransactions: Transaction[], categoryById: Map<string, Category>) {
  const currentGroups = groupSpending(transactions, categoryById);
  const previousGroups = groupSpending(previousTransactions, categoryById);
  const income = selectIncome(transactions) + selectRefunds(transactions);
  const previousIncome = selectIncome(previousTransactions) + selectRefunds(previousTransactions);

  const rows = budgetGroups.map((group) => {
    const actual = group === 'Income' ? income : currentGroups[group] ?? 0;
    const budget = group === 'Income' ? previousIncome || income : previousGroups[group] || actual * 1.15;
    const remaining = group === 'Income' ? actual - budget : budget - actual;
    const progress = budget > 0 ? Math.min(999, (actual / budget) * 100) : actual > 0 ? 100 : 0;
    return {
      id: group,
      label: group,
      budget,
      actual,
      remaining,
      progress,
      status: progress > 100 ? 'over' as const : progress > 85 ? 'watch' as const : 'healthy' as const
    };
  });

  const totals = rows.filter((row) => row.id !== 'Income').reduce(
    (total, row) => ({
      budget: total.budget + row.budget,
      actual: total.actual + row.actual
    }),
    { budget: 0, actual: 0 }
  );

  return [
    ...rows,
    {
      id: 'Totals',
      label: 'Totals',
      budget: totals.budget,
      actual: totals.actual,
      remaining: totals.budget - totals.actual,
      progress: totals.budget > 0 ? (totals.actual / totals.budget) * 100 : 0,
      status: totals.budget > 0 && totals.actual > totals.budget ? 'over' as const : totals.budget > 0 && totals.actual / totals.budget > 0.85 ? 'watch' as const : 'healthy' as const
    }
  ];
}

function derivePreviousBudgetUsed(transactions: Transaction[], categoryById: Map<string, Category>) {
  const groups = groupSpending(transactions, categoryById);
  const actual = Object.values(groups).reduce((total, value) => total + value, 0);
  return actual > 0 ? 100 : 0;
}

function groupSpending(transactions: Transaction[], categoryById: Map<string, Category>) {
  return transactions.reduce<Record<string, number>>((groups, transaction) => {
    if (transaction.type !== 'expense') return groups;
    const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
    const name = `${category?.name ?? ''} ${transaction.merchant ?? ''} ${transaction.description ?? ''}`.toLowerCase();
    const group = classifyGroup(name);
    groups[group] = (groups[group] ?? 0) + transaction.amount;
    return groups;
  }, {});
}

function classifyGroup(name: string) {
  if (billTerms.some((term) => name.includes(term))) return 'Bills';
  if (subscriptionMerchants.some((term) => name.includes(term)) || name.includes('subscription')) return 'Subscriptions';
  if (savingsTerms.some((term) => name.includes(term))) return 'Savings';
  if (debtTerms.some((term) => name.includes(term))) return 'Debt';
  if (name.includes('invest')) return 'Investments';
  if (name.includes('goal')) return 'Goals';
  return 'Expenses';
}

function deriveBills(transactions: Transaction[], categoryById: Map<string, Category>) {
  return transactions
    .filter((transaction) => transaction.type === 'expense' && classifyGroup(`${categoryById.get(transaction.category_id ?? '')?.name ?? ''} ${transaction.merchant ?? ''} ${transaction.description ?? ''}`.toLowerCase()) === 'Bills')
    .map((transaction) => {
      const dueDate = parseISO(transaction.date);
      return {
        id: transaction.id,
        merchant: transaction.merchant || transaction.description || 'Bill payment',
        dueDate: transaction.date,
        budget: transaction.amount,
        paid: transaction.status === 'posted' || transaction.status === 'reconciled' ? transaction.amount : 0,
        remaining: transaction.status === 'posted' || transaction.status === 'reconciled' ? 0 : transaction.amount,
        priority: transaction.amount > 500 ? 'High' : transaction.amount > 100 ? 'Medium' : 'Low',
        overdue: isBefore(dueDate, startOfMonth(new Date())) && transaction.status !== 'posted' && transaction.status !== 'reconciled'
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);
}

function deriveSubscriptions(transactions: Transaction[], categoryById: Map<string, Category>) {
  return transactions
    .filter((transaction) => {
      const text = `${categoryById.get(transaction.category_id ?? '')?.name ?? ''} ${transaction.merchant ?? ''} ${transaction.description ?? ''}`.toLowerCase();
      return transaction.type === 'expense' && (subscriptionMerchants.some((term) => text.includes(term)) || text.includes('subscription'));
    })
    .map((transaction) => ({
      id: transaction.id,
      merchant: transaction.merchant || transaction.description || 'Subscription',
      renewalDate: transaction.date,
      monthlyCost: transaction.amount,
      category: categoryById.get(transaction.category_id ?? '')?.name ?? 'Subscriptions',
      upcoming: isAfter(parseISO(transaction.date), new Date())
    }))
    .slice(0, 5);
}

function deriveIncomeCards(transactions: Transaction[], previousTransactions: Transaction[], accountById: Map<string, Account>) {
  const labels = ['Salary', 'Freelance', 'Business', 'Interest', 'Refund'];
  return labels.map((label) => {
    const received = transactions
      .filter((transaction) => (transaction.type === 'income' || transaction.type === 'refund') && `${transaction.merchant ?? ''} ${transaction.description ?? ''}`.toLowerCase().includes(label.toLowerCase()))
      .reduce((total, transaction) => total + transaction.amount, 0);
    const fallbackReceived = label === 'Salary' && received === 0 ? selectIncome(transactions) : received;
    const expected = previousTransactions
      .filter((transaction) => transaction.type === 'income' && `${transaction.merchant ?? ''} ${transaction.description ?? ''}`.toLowerCase().includes(label.toLowerCase()))
      .reduce((total, transaction) => total + transaction.amount, 0);
    const account = transactions.find((transaction) => transaction.type === 'income')?.account_id;
    return {
      id: label,
      source: label,
      expected: expected || fallbackReceived,
      received: fallbackReceived,
      difference: fallbackReceived - (expected || fallbackReceived),
      depositAccount: account ? accountById.get(account)?.name ?? 'Deposit account' : 'No deposit yet'
    };
  });
}

function deriveSavings(transactions: Transaction[], accountById: Map<string, Account>, categoryById: Map<string, Category>) {
  return transactions.reduce((total, transaction) => {
    const account = accountById.get(transaction.account_id);
    const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
    const text = `${account?.name ?? ''} ${account?.type ?? ''} ${category?.name ?? ''} ${transaction.merchant ?? ''} ${transaction.description ?? ''}`.toLowerCase();
    if (transaction.type === 'expense' && savingsTerms.some((term) => text.includes(term))) return total + transaction.amount;
    if (transaction.type === 'transfer' && metadataValue(transaction, 'direction') === 'incoming' && (account?.type === 'savings' || text.includes('saving'))) return total + transaction.amount;
    return total;
  }, 0);
}

function deriveSavingsCards(transactions: Transaction[], accountById: Map<string, Account>, categoryById: Map<string, Category>, income: number) {
  const contribution = deriveSavings(transactions, accountById, categoryById);
  const goals = ['Emergency Fund', 'Vacation', 'House', 'Education', 'Retirement'];
  return goals.map((goal, index) => {
    const current = goal === 'Emergency Fund' ? contribution : contribution * Math.max(0, 0.5 - index * 0.08);
    const target = Math.max(income * (index === 0 ? 3 : index + 1), current || 1);
    return {
      id: goal,
      goal,
      current,
      contribution: index === 0 ? contribution : 0,
      forecast: current + contribution * 3,
      progress: target > 0 ? Math.min(100, (current / target) * 100) : 0
    };
  });
}

function deriveInsights(input: {
  transactions: Transaction[];
  previousTransactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  bills: MonthlyWorkspaceModel['bills'];
  subscriptions: MonthlyWorkspaceModel['subscriptions'];
  savingsTotal: number;
}): FinanceInsight[] {
  const income = selectIncome(input.transactions);
  const previousIncome = selectIncome(input.previousTransactions);
  const expenses = selectExpense(input.transactions);
  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const decorated = input.transactions.map((transaction) => decorateTransaction(transaction, accountById, categoryById));
  const highest = decorated.filter((transaction) => transaction.type === 'expense').sort((a, b) => b.amount - a.amount)[0];
  const category = deriveCategoryBreakdown(input.transactions, categoryById)[0];
  const merchant = topBy(decorated, (transaction) => transaction.merchantLabel);
  const account = topBy(decorated, (transaction) => transaction.accountName);
  const savingsRate = income > 0 ? (input.savingsTotal / income) * 100 : 0;
  const incomeTrend = previousIncome > 0 ? ((income - previousIncome) / previousIncome) * 100 : 0;

  return [
    incomeTrend !== 0
      ? { id: 'income-trend', title: `Income ${incomeTrend > 0 ? 'increased' : 'decreased'} ${Math.abs(incomeTrend).toFixed(0)}%`, detail: 'Compared with the previous month.', tone: incomeTrend > 0 ? 'good' : 'warning' }
      : { id: 'income-flat', title: 'Income is steady', detail: 'No meaningful month-over-month income movement yet.', tone: 'info' },
    category ? { id: 'top-category', title: `${category.name} leads spending`, detail: `${formatCurrency(category.value)} in tracked expenses.`, tone: 'info' } : { id: 'no-category', title: 'No spending categories yet', detail: 'Categorize transactions to unlock richer budget signals.', tone: 'info' },
    highest ? { id: 'highest', title: 'Highest transaction', detail: `${highest.merchantLabel} at ${formatCurrency(highest.amount)}.`, tone: 'warning' } : { id: 'empty-highest', title: 'No expenses recorded', detail: 'Record or import transactions to populate insights.', tone: 'info' },
    account ? { id: 'account', title: 'Most used account', detail: account, tone: 'info' } : { id: 'account-empty', title: 'No account activity yet', detail: 'Activity will appear after ledger entries are created.', tone: 'info' },
    merchant ? { id: 'merchant', title: 'Largest merchant pattern', detail: merchant, tone: 'info' } : { id: 'merchant-empty', title: 'Merchant tracking is waiting', detail: 'Add merchants to transactions for better insights.', tone: 'info' },
    input.bills.length > 0 ? { id: 'bill', title: 'Upcoming bill', detail: `${input.bills[0].merchant} on ${format(parseISO(input.bills[0].dueDate), 'MMM d')}.`, tone: input.bills[0].overdue ? 'warning' : 'info' } : { id: 'bill-empty', title: 'No bills detected', detail: 'Bill insights are derived from bill-like ledger entries.', tone: 'info' },
    input.subscriptions.length > 0 ? { id: 'subs', title: 'Subscriptions detected', detail: `${input.subscriptions.length} recurring-style merchants found.`, tone: 'info' } : { id: 'subs-empty', title: 'No subscriptions detected', detail: 'Subscription merchants will appear here automatically.', tone: 'info' },
    { id: 'savings-rate', title: `Savings rate ${savingsRate.toFixed(0)}%`, detail: expenses > income ? 'Expenses are above income this month.' : 'Derived from savings-like ledger activity.', tone: savingsRate >= 20 ? 'good' : savingsRate > 0 ? 'info' : 'warning' }
  ];
}

function topBy<T>(values: T[], getKey: (value: T) => string) {
  const counts = values.reduce<Record<string, number>>((map, value) => {
    const key = getKey(value);
    if (!key || key === 'Unknown account') return map;
    map[key] = (map[key] ?? 0) + 1;
    return map;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatCurrency(value: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

export function formatPercent(value: number) {
  return `${Math.round(value || 0)}%`;
}

