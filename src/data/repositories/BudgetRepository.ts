import { format, startOfMonth, subMonths } from 'date-fns';
import { buildBudgetBundle, deriveBudgetAlerts } from '@/core/budget/BudgetIntelligenceEngine';
import { supabase } from '@/data/supabase/client';
import type { BudgetBundle, BudgetPeriod } from '@/types/intelligence';
import { CategoriesRepository } from './CategoriesRepository';
import { TransactionsRepository } from './TransactionsRepository';
import { throwDatabaseError } from './repositoryError';

export const BudgetRepository = {
  async getBundle(householdId: string): Promise<BudgetBundle> {
    const start = format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd');
    const end = format(new Date(), 'yyyy-MM-dd');
    const [categories, transactions] = await Promise.all([
      CategoriesRepository.list(),
      TransactionsRepository.listByPeriod(start, end)
    ]);
    return buildBudgetBundle(
      categories.filter((category) => category.household_id === householdId),
      transactions
    );
  },

  async updateCategoryBudget(
    categoryId: string,
    input: {
      budgetAmount: number | null;
      budgetPeriod: BudgetPeriod;
      budgetStartDate?: string | null;
      budgetEndDate?: string | null;
      alertsEnabled?: boolean;
    }
  ) {
    return CategoriesRepository.update(categoryId, {
      budget_amount: input.budgetAmount,
      budget_period: input.budgetPeriod,
      budget_start_date: input.budgetStartDate ?? null,
      budget_end_date: input.budgetEndDate ?? null,
      budget_alerts_enabled: input.alertsEnabled ?? true
    });
  },

  async syncAlerts(householdId: string, userId: string, bundle: BudgetBundle): Promise<void> {
    const byCategory = new Map(bundle.rows.map((row) => [row.id, row]));
    const rows = deriveBudgetAlerts(bundle).map((alert) => {
      const budget = byCategory.get(alert.categoryId)!;
      return {
        household_id: householdId,
        user_id: userId,
        category_id: alert.categoryId,
        notification_type: alert.notificationType,
        threshold_pct: alert.thresholdPct ?? null,
        period_start: budget.periodStart,
        period_end: budget.periodEnd,
        actual_amount: budget.spent,
        budget_amount: budget.budget,
        title: alert.title,
        message: alert.message
      };
    });
    if (!rows.length) return;

    const { error } = await supabase.from('budget_notifications').upsert(rows, {
      onConflict: 'household_id,category_id,notification_type,period_start,period_end',
      ignoreDuplicates: true
    });
    if (error) throwDatabaseError('Failed to synchronize budget alerts', error);
  }
};

