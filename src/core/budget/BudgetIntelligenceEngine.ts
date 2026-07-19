import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths
} from 'date-fns';
import type { Category, Transaction } from '@/types/finance';
import type { BudgetAlertStatus, BudgetBundle, BudgetCategoryRow, BudgetPeriod } from '@/types/intelligence';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function periodFor(category: Category, now: Date) {
  const metadata = category.metadata && typeof category.metadata === 'object' && !Array.isArray(category.metadata)
    ? category.metadata as Record<string, unknown>
    : {};
  const metadataPeriod = ['monthly', 'quarterly', 'yearly', 'custom'].includes(String(metadata.budget_period))
    ? String(metadata.budget_period) as BudgetPeriod
    : 'monthly';
  const period = category.budget_period ?? metadataPeriod;
  if (period === 'custom' && category.budget_start_date && category.budget_end_date) {
    return { period, start: parseISO(category.budget_start_date), end: parseISO(category.budget_end_date) };
  }
  if (period === 'quarterly') return { period, start: startOfQuarter(now), end: endOfQuarter(now) };
  if (period === 'yearly') return { period, start: startOfYear(now), end: endOfYear(now) };
  return { period: 'monthly' as const, start: startOfMonth(now), end: endOfMonth(now) };
}

function transactionSpend(transaction: Transaction): number {
  if (transaction.deleted_at || transaction.soft_delete || ['void', 'expected'].includes(transaction.status)) return 0;
  if (transaction.type === 'refund') return -Math.abs(transaction.amount);
  if (transaction.type === 'expense' || transaction.type === 'adjustment') return Math.abs(transaction.amount);
  return 0;
}

function alertStatus(utilizationPct: number): BudgetAlertStatus {
  if (utilizationPct > 100) return 'exceeded';
  if (utilizationPct >= 90) return 'critical';
  if (utilizationPct >= 75) return 'watch';
  return 'healthy';
}

function monthlyHistory(categoryId: string, transactions: Transaction[], now: Date) {
  return eachMonthOfInterval({ start: startOfMonth(subMonths(now, 11)), end: startOfMonth(now) }).map((month) => {
    const key = format(month, 'yyyy-MM');
    const amount = transactions
      .filter((transaction) => transaction.category_id === categoryId && transaction.date.startsWith(key))
      .reduce((sum, transaction) => sum + transactionSpend(transaction), 0);
    return { month: format(month, 'MMM yy'), amount: round2(Math.max(0, amount)) };
  });
}

function buildRow(category: Category, transactions: Transaction[], now: Date): BudgetCategoryRow | null {
  const metadata = category.metadata && typeof category.metadata === 'object' && !Array.isArray(category.metadata)
    ? category.metadata as Record<string, unknown>
    : {};
  const budget = category.budget_amount ?? (typeof metadata.budget === 'number' ? metadata.budget : 0);
  if (budget <= 0 || category.type !== 'expense') return null;

  const { period, start, end } = periodFor(category, now);
  const spent = transactions
    .filter((transaction) => {
      if (transaction.category_id !== category.id) return false;
      const date = parseISO(transaction.date);
      return isWithinInterval(date, { start, end });
    })
    .reduce((sum, transaction) => sum + transactionSpend(transaction), 0);
  const safeSpent = Math.max(0, spent);
  const utilizationPct = budget > 0 ? (safeSpent / budget) * 100 : 0;
  const dailyTotals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.category_id !== category.id) continue;
    const date = parseISO(transaction.date);
    if (!isWithinInterval(date, { start, end })) continue;
    dailyTotals.set(transaction.date, Math.max(0, (dailyTotals.get(transaction.date) ?? 0) + transactionSpend(transaction)));
  }
  const orderedDays = [...dailyTotals].sort(([a], [b]) => a.localeCompare(b));
  const latestDaySpend = orderedDays.at(-1)?.[1] ?? 0;
  const priorDays = orderedDays.slice(0, -1).map(([, value]) => value).filter((value) => value > 0);
  const priorDailyAverage = priorDays.length ? priorDays.reduce((sum, value) => sum + value, 0) / priorDays.length : 0;
  const dailySpikePct = priorDailyAverage > 0 ? ((latestDaySpend - priorDailyAverage) / priorDailyAverage) * 100 : 0;
  const history = monthlyHistory(category.id, transactions, now);
  const previous = history.at(-2)?.amount ?? 0;
  const current = history.at(-1)?.amount ?? 0;
  const monthlyTrendPct = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    budget: round2(budget),
    spent: round2(safeSpent),
    remaining: round2(budget - safeSpent),
    utilizationPct: round2(utilizationPct),
    monthlyTrendPct: round2(monthlyTrendPct),
    dailySpikePct: round2(dailySpikePct),
    alertStatus: alertStatus(utilizationPct),
    period: period as BudgetPeriod,
    periodStart: format(start, 'yyyy-MM-dd'),
    periodEnd: format(end, 'yyyy-MM-dd'),
    monthlyHistory: history
  };
}

export function buildBudgetBundle(categories: Category[], transactions: Transaction[], now = new Date()): BudgetBundle {
  const rows = categories
    .filter((category) => !category.deleted_at)
    .map((category) => buildRow(category, transactions, now))
    .filter((row): row is BudgetCategoryRow => Boolean(row))
    .sort((a, b) => b.utilizationPct - a.utilizationPct);

  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const activeStart = rows.length ? Math.min(...rows.map((row) => parseISO(row.periodStart).getTime())) : startOfMonth(now).getTime();
  const activeEnd = rows.length ? Math.max(...rows.map((row) => parseISO(row.periodEnd).getTime())) : endOfMonth(now).getTime();
  const totalDays = Math.max(1, differenceInCalendarDays(activeEnd, activeStart) + 1);
  const elapsedDays = clamp(differenceInCalendarDays(now, new Date(activeStart)) + 1, 1, totalDays);
  const predictedPeriodEndSpending = (totalSpent / elapsedDays) * totalDays;

  const monthlyMap = new Map<string, { budget: number; actual: number }>();
  for (const row of rows) {
    for (const point of row.monthlyHistory) {
      const existing = monthlyMap.get(point.month) ?? { budget: 0, actual: 0 };
      existing.actual += point.amount;
      const divisor = row.period === 'quarterly' ? 3 : row.period === 'yearly' ? 12 : 1;
      existing.budget += row.budget / divisor;
      monthlyMap.set(point.month, existing);
    }
  }
  const monthlyTrend = [...monthlyMap].map(([month, values]) => ({
    month,
    budget: round2(values.budget),
    actual: round2(values.actual)
  }));
  const activeMonths = monthlyTrend.filter((point) => point.actual > 0);
  const highest = activeMonths.length ? activeMonths.reduce((a, b) => (a.actual > b.actual ? a : b)) : null;
  const lowest = activeMonths.length ? activeMonths.reduce((a, b) => (a.actual < b.actual ? a : b)) : null;

  return {
    rows,
    kpis: {
      utilizationPct: totalBudget > 0 ? round2((totalSpent / totalBudget) * 100) : 0,
      averageSpending: activeMonths.length ? round2(activeMonths.reduce((sum, point) => sum + point.actual, 0) / activeMonths.length) : 0,
      highestSpendingMonth: highest ? { month: highest.month, amount: highest.actual } : null,
      lowestSpendingMonth: lowest ? { month: lowest.month, amount: lowest.actual } : null,
      remainingBudget: round2(totalBudget - totalSpent),
      predictedPeriodEndSpending: round2(predictedPeriodEndSpending),
      accuracyPct: totalBudget > 0 ? round2(clamp(100 - (Math.abs(predictedPeriodEndSpending - totalBudget) / totalBudget) * 100, 0, 100)) : 0,
      efficiencyPct: totalBudget > 0 ? round2(clamp(((totalBudget - totalSpent) / totalBudget) * 100, 0, 100)) : 0
    },
    monthlyTrend,
    distribution: rows.map((row) => ({ name: row.name, value: row.spent, color: row.color }))
  };
}

export type BudgetAlertCandidate = {
  categoryId: string;
  notificationType:
    | 'threshold_50'
    | 'threshold_75'
    | 'threshold_90'
    | 'threshold_100'
    | 'exceeded'
    | 'daily_spike'
    | 'unusual_spending'
    | 'category_overspending'
    | 'nearly_finished'
    | 'reset_reminder';
  thresholdPct?: number;
  title: string;
  message: string;
};

export function deriveBudgetAlerts(bundle: BudgetBundle, now = new Date()): BudgetAlertCandidate[] {
  return bundle.rows.flatMap((row) => {
    const alerts: BudgetAlertCandidate[] = [];
    const base = { categoryId: row.id };
    if (row.utilizationPct > 100) {
      alerts.push({ ...base, notificationType: 'exceeded', thresholdPct: 100, title: `${row.name} budget exceeded`, message: `Spending is ${row.utilizationPct.toFixed(0)}% of the budget.` });
      alerts.push({ ...base, notificationType: 'category_overspending', thresholdPct: 100, title: `${row.name} is overspending`, message: `Actual spending is above the assigned category budget.` });
    } else if (row.utilizationPct >= 100) {
      alerts.push({ ...base, notificationType: 'threshold_100', thresholdPct: 100, title: `${row.name} budget used`, message: 'The category budget is fully used.' });
    } else if (row.utilizationPct >= 90) {
      alerts.push({ ...base, notificationType: 'threshold_90', thresholdPct: 90, title: `${row.name} reached 90%`, message: 'This budget is nearly finished.' });
      alerts.push({ ...base, notificationType: 'nearly_finished', thresholdPct: 90, title: `${row.name} budget nearly finished`, message: 'Less than 10% of this category budget remains.' });
    } else if (row.utilizationPct >= 75) {
      alerts.push({ ...base, notificationType: 'threshold_75', thresholdPct: 75, title: `${row.name} reached 75%`, message: 'Review remaining planned spending.' });
    } else if (row.utilizationPct >= 50) {
      alerts.push({ ...base, notificationType: 'threshold_50', thresholdPct: 50, title: `${row.name} reached 50%`, message: 'Half of this category budget is used.' });
    }
    if (row.monthlyTrendPct > 50 && row.spent > 0) {
      alerts.push({ ...base, notificationType: 'unusual_spending', title: `Unusual ${row.name} spending`, message: `Spending is ${row.monthlyTrendPct.toFixed(0)}% higher than last month.` });
    }
    if (row.dailySpikePct > 100) {
      alerts.push({ ...base, notificationType: 'daily_spike', title: `${row.name} daily spending spike`, message: `The latest spending day was ${row.dailySpikePct.toFixed(0)}% above the recent daily average.` });
    }
    if (differenceInCalendarDays(parseISO(row.periodEnd), now) <= 3) {
      alerts.push({ ...base, notificationType: 'reset_reminder', title: `${row.name} budget resets soon`, message: `The ${row.period} budget period ends on ${row.periodEnd}.` });
    }
    return alerts;
  });
}

