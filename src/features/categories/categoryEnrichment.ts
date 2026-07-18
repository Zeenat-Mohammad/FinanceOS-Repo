import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { Category, Transaction } from '@/types/finance';
import { getCategoryMeta, isCategoryArchived } from '@/data/repositories/CategoriesRepository';

export type CategoryUsage = {
  transactionCount: number;
  totalAmount: number;
  monthlyAverage: number;
  lastUsed: string | null;
  monthlyTrend: number[];
  monthLabels: string[];
};

export type EnrichedCategory = Category & {
  archived: boolean;
  archivedAt: string | null;
  description: string;
  budget: number;
  budgetApplicable: boolean;
  parentName: string | null;
  childCount: number;
  usage: CategoryUsage;
  budgetRemaining: number;
  budgetProgress: number;
  budgetStatus: 'healthy' | 'watch' | 'over' | 'none';
};

export function enrichCategories(categories: Category[], transactions: Transaction[]): EnrichedCategory[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    monthKeys.push(format(subMonths(now, i), 'yyyy-MM'));
  }

  const usageMap = new Map<string, { count: number; total: number; lastUsed: string | null; months: Record<string, number> }>();

  for (const tx of transactions) {
    if (tx.deleted_at || tx.soft_delete || tx.status === 'void') continue;
    if (!tx.category_id) continue;
    const entry = usageMap.get(tx.category_id) ?? { count: 0, total: 0, lastUsed: null, months: {} };
    entry.count += 1;
    entry.total += Math.abs(tx.amount);
    if (!entry.lastUsed || tx.date > entry.lastUsed) entry.lastUsed = tx.date;
    const key = tx.date.slice(0, 7);
    entry.months[key] = (entry.months[key] ?? 0) + Math.abs(tx.amount);
    usageMap.set(tx.category_id, entry);
  }

  return categories.map((category) => {
    const meta = getCategoryMeta(category);
    const archived = isCategoryArchived(category);
    const raw = usageMap.get(category.id) ?? { count: 0, total: 0, lastUsed: null, months: {} };
    const trend = monthKeys.map((k) => raw.months[k] ?? 0);
    const monthsWithActivity = trend.filter((v) => v > 0).length || 1;
    const monthlyAverage = raw.total / Math.max(monthsWithActivity, 1);
    const currentMonthSpend = trend[trend.length - 1] ?? 0;
    const budget = meta.budget;
    const budgetRemaining = budget > 0 ? budget - currentMonthSpend : 0;
    const budgetProgress = budget > 0 ? (currentMonthSpend / budget) * 100 : 0;
    let budgetStatus: EnrichedCategory['budgetStatus'] = 'none';
    if (budget > 0) {
      budgetStatus = budgetProgress >= 100 ? 'over' : budgetProgress >= 80 ? 'watch' : 'healthy';
    }

    const children = categories.filter((c) => c.parent_id === category.id && !isCategoryArchived(c));

    return {
      ...category,
      archived,
      archivedAt: meta.archivedAt,
      description: meta.description,
      budget,
      budgetApplicable: meta.budgetApplicable,
      parentName: category.parent_id ? byId.get(category.parent_id)?.name ?? null : null,
      childCount: children.length,
      usage: {
        transactionCount: raw.count,
        totalAmount: raw.total,
        monthlyAverage,
        lastUsed: raw.lastUsed,
        monthlyTrend: trend,
        monthLabels: monthKeys.map((k) => {
          const [y, m] = k.split('-');
          return format(new Date(Number(y), Number(m) - 1, 1), 'MMM');
        })
      },
      budgetRemaining,
      budgetProgress,
      budgetStatus
    };
  });
}

export function countUncategorized(transactions: Transaction[]): number {
  return transactions.filter((tx) => !tx.deleted_at && !tx.soft_delete && tx.status !== 'void' && !tx.category_id).length;
}

export function loadLookbackWindow() {
  const end = endOfMonth(new Date());
  const start = startOfMonth(subMonths(end, 5));
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
  };
}
