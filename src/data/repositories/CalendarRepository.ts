import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { RecurringRepository, type PaymentInstance } from './RecurringRepository';
import { TransactionsRepository } from './TransactionsRepository';
import { AccountsRepository } from './AccountsRepository';
import { CategoriesRepository } from './CategoriesRepository';
import { ReminderRepository } from './ReminderRepository';
import { PaymentEngine } from '@/core/recurring';
import type { CalendarReminder, RecurringRule } from '@/types/database';
import type { Account, Category, Transaction } from '@/types/finance';

export type CalendarFinancialEvent = {
  id: string;
  source: 'transaction' | 'recurring' | 'reminder';
  date: string;
  title: string;
  account?: string;
  category?: string;
  amount: number;
  status: string;
  kind: 'income' | 'expense' | 'recurring' | 'savings' | 'investment' | 'debt' | 'transfer' | 'reminder';
  transactionId?: string;
  recurringInstanceId?: string;
  reminderId?: string;
  caption?: string | null;
  time?: string;
};

export type CalendarDayBucket = {
  date: string;
  instances: PaymentInstance[];
  events: CalendarFinancialEvent[];
  incomeCount: number;
  expenseCount: number;
  savingsCount: number;
  investmentCount: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
  totals: {
    income: number;
    expenses: number;
    savings: number;
    investments: number;
    recurring: number;
    net: number;
  };
};

export const CalendarRepository = {
  async getMonth(householdId: string, anchor: Date): Promise<{
    rules: RecurringRule[];
    instances: PaymentInstance[];
    reminders: CalendarReminder[];
    days: CalendarDayBucket[];
  }> {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const [rules, transactions, accounts, categories, reminders] = await Promise.all([
      RecurringRepository.listRules(),
      TransactionsRepository.listByPeriod(startStr, endStr).catch(() => [] as Transaction[]),
      AccountsRepository.list().catch(() => [] as Account[]),
      CategoriesRepository.list().catch(() => [] as Category[]),
      ReminderRepository.listCalendarReminders(householdId, startStr, endStr).catch(() => [] as CalendarReminder[])
    ]);
    const instances = await RecurringRepository.ensureHorizon(householdId, rules, 2);
    const monthInstances = instances.filter((i) => i.scheduled_date >= startStr && i.scheduled_date <= endStr);
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const byDate = new Map<string, PaymentInstance[]>();
    for (const instance of monthInstances) {
      const list = byDate.get(instance.scheduled_date) ?? [];
      list.push(instance);
      byDate.set(instance.scheduled_date, list);
    }
    const eventsByDate = buildEventsByDate(transactions, monthInstances, rules, reminders, accountById, categoryById);

    const days: CalendarDayBucket[] = [];
    let cursor = start;
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd');
      const list = byDate.get(key) ?? [];
      const events = eventsByDate.get(key) ?? [];
      const totals = summarizeEvents(events);
      days.push({
        date: key,
        instances: list,
        events,
        incomeCount: list.filter((i) => i.transaction_type === 'income').length,
        expenseCount: list.filter((i) => i.transaction_type === 'expense').length,
        savingsCount: events.filter((event) => event.kind === 'savings').length,
        investmentCount: events.filter((event) => event.kind === 'investment').length,
        pendingCount: list.filter((i) => i.status === 'pending').length,
        overdueCount: list.filter((i) => i.status === 'overdue').length,
        paidCount: list.filter((i) => i.status === 'paid').length,
        totals
      });
      cursor = addDays(cursor, 1);
    }

    return { rules, instances: monthInstances, reminders, days };
  },

  async getWeek(householdId: string, anchor: Date) {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const [rules, transactions, accounts, categories, reminders] = await Promise.all([
      RecurringRepository.listRules(),
      TransactionsRepository.listByPeriod(startStr, endStr).catch(() => [] as Transaction[]),
      AccountsRepository.list().catch(() => [] as Account[]),
      CategoriesRepository.list().catch(() => [] as Category[]),
      ReminderRepository.listCalendarReminders(householdId, startStr, endStr).catch(() => [] as CalendarReminder[])
    ]);
    const instances = await RecurringRepository.ensureHorizon(householdId, rules, 2);
    const weekInstances = PaymentEngine.instancesForWeek(instances, anchor);
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const eventsByDate = buildEventsByDate(transactions, weekInstances, rules, reminders, accountById, categoryById);
    const days = PaymentEngine.weekDays(anchor).map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const list = weekInstances.filter((i) => i.scheduled_date === key);
      return { date: key, day, instances: list, events: eventsByDate.get(key) ?? [] };
    });
    return { rules, instances: weekInstances, reminders, days };
  }
};

function buildEventsByDate(
  transactions: Transaction[],
  instances: PaymentInstance[],
  rules: RecurringRule[],
  reminders: CalendarReminder[],
  accountById: Map<string, Account>,
  categoryById: Map<string, Category>
) {
  const map = new Map<string, CalendarFinancialEvent[]>();
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));

  const push = (event: CalendarFinancialEvent) => {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  };

  for (const transaction of transactions) {
    if (transaction.deleted_at || transaction.soft_delete || transaction.status === 'void') continue;
    const account = accountById.get(transaction.account_id);
    const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
    const label = transaction.merchant || transaction.description || category?.name || titleCase(transaction.type);
    push({
      id: `tx-${transaction.id}`,
      source: 'transaction',
      date: transaction.date,
      title: label,
      account: account?.name,
      category: category?.name,
      amount: transaction.amount,
      status: transaction.status,
      kind: classifyTransaction(transaction, account, category),
      transactionId: transaction.id
    });
  }

  for (const instance of instances) {
    const rule = rulesById.get(instance.recurring_rule_id);
    const account = rule?.account_id ? accountById.get(rule.account_id) : undefined;
    const category = rule?.category_id ? categoryById.get(rule.category_id) : undefined;
    push({
      id: `rec-${instance.id}`,
      source: 'recurring',
      date: instance.scheduled_date,
      title: instance.name,
      account: account?.name,
      category: category?.name,
      amount: instance.amount,
      status: instance.status,
      kind: 'recurring',
      recurringInstanceId: instance.id
    });
  }

  for (const reminder of reminders) {
    if (reminder.deleted_at || reminder.status === 'cancelled') continue;
    push({
      id: `rem-${reminder.id}`,
      source: 'reminder',
      date: reminder.reminder_date,
      title: reminder.title,
      amount: 0,
      status: reminder.status,
      kind: 'reminder',
      reminderId: reminder.id,
      caption: reminder.caption,
      time: reminder.reminder_time
    });
  }

  for (const [date, events] of map) {
    map.set(date, events.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || b.amount - a.amount));
  }

  return map;
}

function classifyTransaction(transaction: Transaction, account?: Account, category?: Category): CalendarFinancialEvent['kind'] {
  const text = `${account?.name ?? ''} ${account?.type ?? ''} ${category?.name ?? ''} ${transaction.merchant ?? ''} ${transaction.description ?? ''}`.toLowerCase();
  if (transaction.type === 'income' || transaction.type === 'refund') return 'income';
  if (transaction.type === 'transfer') return text.includes('saving') ? 'savings' : 'transfer';
  if (/saving|emergency|sinking|goal/.test(text)) return 'savings';
  if (/invest|sip|mutual|etf|stock|crypto|gold/.test(text)) return 'investment';
  if (/debt|loan|emi|credit card|min payment/.test(text)) return 'debt';
  return 'expense';
}

function summarizeEvents(events: CalendarFinancialEvent[]): CalendarDayBucket['totals'] {
  return events.reduce(
    (totals, event) => {
      if (event.kind === 'income') totals.income += event.amount;
      if (event.kind === 'expense' || event.kind === 'debt' || event.kind === 'transfer') totals.expenses += event.amount;
      if (event.kind === 'savings') totals.savings += event.amount;
      if (event.kind === 'investment') totals.investments += event.amount;
      if (event.kind === 'recurring') totals.recurring += event.amount;
      totals.net = totals.income - totals.expenses - totals.savings - totals.investments;
      return totals;
    },
    { income: 0, expenses: 0, savings: 0, investments: 0, recurring: 0, net: 0 }
  );
}

function kindOrder(kind: CalendarFinancialEvent['kind']) {
  return ['income', 'expense', 'recurring', 'reminder', 'debt', 'savings', 'investment', 'transfer'].indexOf(kind);
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
