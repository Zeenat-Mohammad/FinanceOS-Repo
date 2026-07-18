import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isBefore,
  isAfter,
  parseISO,
  startOfDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  differenceInCalendarDays
} from 'date-fns';
import type { RecurringRule } from '@/types/database';
import type { Json } from '@/types/finance';

export type RecurringKind = 'income' | 'bill' | 'subscription' | 'debt' | 'savings' | 'other';

export type PaymentInstanceStatus = 'pending' | 'paid' | 'skipped' | 'overdue';

export type PaymentInstance = {
  id: string;
  household_id: string;
  recurring_rule_id: string;
  transaction_id: string | null;
  scheduled_date: string;
  paid_date: string | null;
  status: PaymentInstanceStatus;
  amount: number;
  currency: string;
  name: string;
  transaction_type: 'income' | 'expense' | 'transfer';
  account_id?: string | null;
  category_id?: string | null;
  metadata: Json;
};

export type RecurringMeta = {
  kind: RecurringKind;
  reminder_days: number;
  auto_create_transaction: boolean;
  description: string;
};

export type RecurringStats = {
  totalCount: number;
  expenseCount: number;
  incomeCount: number;
  monthlyExpense: number;
  monthlyIncome: number;
  monthlyNet: number;
  dueThisMonthCount: number;
  dueThisMonthAmount: number;
  paidThisMonthCount: number;
  paidThisMonthAmount: number;
  upcoming7Count: number;
  upcoming7Amount: number;
  overdueCount: number;
  overdueAmount: number;
  activeSubscriptions: number;
  yearlyExpense: number;
  yearlyIncome: number;
};

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export function getRecurringMeta(rule: RecurringRule): RecurringMeta {
  const meta = asRecord(rule.metadata);
  const kind = (typeof meta.kind === 'string' ? meta.kind : rule.transaction_type === 'income' ? 'income' : 'bill') as RecurringKind;
  return {
    kind,
    reminder_days: typeof meta.reminder_days === 'number' ? meta.reminder_days : 3,
    auto_create_transaction: meta.auto_create_transaction !== false,
    description: typeof meta.description === 'string' ? meta.description : ''
  };
}

export function cadenceToMonthlyFactor(cadence: RecurringRule['cadence'], interval = 1): number {
  const i = Math.max(1, interval);
  switch (cadence) {
    case 'daily':
      return (365 / 12) / i;
    case 'weekly':
      return (52 / 12) / i;
    case 'biweekly':
      return (26 / 12) / i;
    case 'semimonthly':
      return 2 / i;
    case 'monthly':
      return 1 / i;
    case 'quarterly':
      return 1 / (3 * i);
    case 'annual':
      return 1 / (12 * i);
    default:
      return 1 / i;
  }
}

export function nextOccurrenceAfter(fromDate: string | Date, cadence: RecurringRule['cadence'], interval = 1): Date {
  const from = typeof fromDate === 'string' ? parseISO(fromDate) : fromDate;
  const i = Math.max(1, interval);
  switch (cadence) {
    case 'daily':
      return addDays(from, i);
    case 'weekly':
      return addWeeks(from, i);
    case 'biweekly':
      return addWeeks(from, 2 * i);
    case 'semimonthly':
      return addDays(from, 15 * i);
    case 'monthly':
      return addMonths(from, i);
    case 'quarterly':
      return addMonths(from, 3 * i);
    case 'annual':
      return addYears(from, i);
    default:
      return addMonths(from, i);
  }
}

/** Generate scheduled dates from start through horizonEnd (inclusive). */
export function generateScheduleDates(rule: RecurringRule, horizonEnd: Date, horizonStart?: Date): string[] {
  if (rule.status === 'paused' || rule.status === 'ended') return [];
  const start = parseISO(rule.starts_on);
  const endLimit = rule.ends_on ? parseISO(rule.ends_on) : horizonEnd;
  const hardEnd = isBefore(endLimit, horizonEnd) ? endLimit : horizonEnd;
  const begin = horizonStart && isAfter(horizonStart, start) ? horizonStart : start;

  let cursor = startOfDay(start);
  // Fast-forward until >= begin
  let guard = 0;
  while (isBefore(cursor, begin) && guard < 500) {
    cursor = nextOccurrenceAfter(cursor, rule.cadence, rule.interval_count || 1);
    guard += 1;
  }

  const dates: string[] = [];
  guard = 0;
  while (!isAfter(cursor, hardEnd) && guard < 400) {
    if (!isBefore(cursor, begin)) {
      dates.push(format(cursor, 'yyyy-MM-dd'));
    }
    cursor = nextOccurrenceAfter(cursor, rule.cadence, rule.interval_count || 1);
    guard += 1;
  }
  return dates;
}

export function resolveInstanceStatus(
  scheduledDate: string,
  stored: PaymentInstanceStatus | null,
  today = startOfDay(new Date())
): PaymentInstanceStatus {
  if (stored === 'paid' || stored === 'skipped') return stored;
  const due = startOfDay(parseISO(scheduledDate));
  if (isBefore(due, today)) return 'overdue';
  return 'pending';
}

export function buildVirtualInstances(
  rules: RecurringRule[],
  rangeStart: Date,
  rangeEnd: Date,
  existing: PaymentInstance[] = []
): PaymentInstance[] {
  const existingKey = new Map(existing.map((i) => [`${i.recurring_rule_id}:${i.scheduled_date}`, i]));
  const today = startOfDay(new Date());
  const out: PaymentInstance[] = [];

  for (const rule of rules.filter((r) => !r.deleted_at && r.status === 'active')) {
    const dates = generateScheduleDates(rule, rangeEnd, rangeStart);
    for (const date of dates) {
      const key = `${rule.id}:${date}`;
      const prior = existingKey.get(key);
      if (prior) {
        out.push({
          ...prior,
          status: resolveInstanceStatus(date, prior.status, today)
        });
        continue;
      }
      out.push({
        id: `virtual-${rule.id}-${date}`,
        household_id: rule.household_id,
        recurring_rule_id: rule.id,
        transaction_id: null,
        scheduled_date: date,
        paid_date: null,
        status: resolveInstanceStatus(date, 'pending', today),
        amount: rule.amount ?? 0,
        currency: rule.currency,
        name: rule.name,
        transaction_type: rule.transaction_type,
        account_id: rule.account_id,
        category_id: rule.category_id,
        metadata: { virtual: true }
      });
    }
  }

  return out.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

export function computeRecurringStats(rules: RecurringRule[], instances: PaymentInstance[], today = new Date()): RecurringStats {
  const active = rules.filter((r) => !r.deleted_at && r.status === 'active');
  const monthKey = format(today, 'yyyy-MM');
  const in7 = format(addDays(today, 7), 'yyyy-MM-dd');
  const todayStr = format(today, 'yyyy-MM-dd');

  let monthlyExpense = 0;
  let monthlyIncome = 0;
  let activeSubscriptions = 0;

  for (const rule of active) {
    const amount = rule.amount ?? 0;
    const factor = cadenceToMonthlyFactor(rule.cadence, rule.interval_count || 1);
    const monthly = amount * factor;
    if (rule.transaction_type === 'income') monthlyIncome += monthly;
    else monthlyExpense += monthly;
    if (getRecurringMeta(rule).kind === 'subscription') activeSubscriptions += 1;
  }

  const monthInstances = instances.filter((i) => i.scheduled_date.startsWith(monthKey));
  const dueThisMonth = monthInstances.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const paidThisMonth = monthInstances.filter((i) => i.status === 'paid');
  const upcoming7 = instances.filter(
    (i) => (i.status === 'pending' || i.status === 'overdue') && i.scheduled_date >= todayStr && i.scheduled_date <= in7
  );
  const overdue = instances.filter((i) => i.status === 'overdue');

  return {
    totalCount: active.length,
    expenseCount: active.filter((r) => r.transaction_type === 'expense').length,
    incomeCount: active.filter((r) => r.transaction_type === 'income').length,
    monthlyExpense,
    monthlyIncome,
    monthlyNet: monthlyIncome - monthlyExpense,
    dueThisMonthCount: dueThisMonth.length,
    dueThisMonthAmount: dueThisMonth.reduce((s, i) => s + i.amount, 0),
    paidThisMonthCount: paidThisMonth.length,
    paidThisMonthAmount: paidThisMonth.reduce((s, i) => s + i.amount, 0),
    upcoming7Count: upcoming7.length,
    upcoming7Amount: upcoming7.reduce((s, i) => s + i.amount, 0),
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, i) => s + i.amount, 0),
    activeSubscriptions,
    yearlyExpense: monthlyExpense * 12,
    yearlyIncome: monthlyIncome * 12
  };
}

export function weekDays(anchor = new Date()) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function instancesForWeek(instances: PaymentInstance[], anchor = new Date()) {
  const days = weekDays(anchor);
  const start = format(days[0], 'yyyy-MM-dd');
  const end = format(days[days.length - 1], 'yyyy-MM-dd');
  return instances.filter((i) => i.scheduled_date >= start && i.scheduled_date <= end);
}

export function reminderInsights(instances: PaymentInstance[], rules: RecurringRule[]): Array<{ id: string; title: string; body: string; severity: 'info' | 'warning' | 'critical' }> {
  const today = startOfDay(new Date());
  const ruleMap = new Map(rules.map((r) => [r.id, r]));
  const insights: Array<{ id: string; title: string; body: string; severity: 'info' | 'warning' | 'critical' }> = [];

  for (const instance of instances) {
    if (instance.status === 'paid' || instance.status === 'skipped') continue;
    const due = startOfDay(parseISO(instance.scheduled_date));
    const days = differenceInCalendarDays(due, today);
    const rule = ruleMap.get(instance.recurring_rule_id);
    const reminder = rule ? getRecurringMeta(rule).reminder_days : 3;

    if (instance.status === 'overdue') {
      insights.push({
        id: `overdue-${instance.id}`,
        title: `${instance.name} payment overdue`,
        body: `Was due ${instance.scheduled_date}.`,
        severity: 'critical'
      });
    } else if (days === 0) {
      insights.push({
        id: `today-${instance.id}`,
        title: instance.transaction_type === 'income' ? `${instance.name} expected today` : `${instance.name} due today`,
        body: `Scheduled for ${instance.scheduled_date}.`,
        severity: 'warning'
      });
    } else if (days > 0 && days <= reminder) {
      insights.push({
        id: `soon-${instance.id}`,
        title: `${instance.name} due in ${days} day${days === 1 ? '' : 's'}`,
        body: `Reminder window (${reminder} days).`,
        severity: 'info'
      });
    }
  }

  return insights.slice(0, 8);
}

export function isSameCalendarDay(a: string, b: Date) {
  return isSameDay(parseISO(a), b);
}

export const PaymentEngine = {
  getRecurringMeta,
  cadenceToMonthlyFactor,
  nextOccurrenceAfter,
  generateScheduleDates,
  resolveInstanceStatus,
  buildVirtualInstances,
  computeRecurringStats,
  weekDays,
  instancesForWeek,
  reminderInsights
};
