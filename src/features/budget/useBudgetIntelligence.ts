import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BudgetRepository } from '@/data/repositories/BudgetRepository';
import { queryKeys } from '@/data/query-keys';
import type { BudgetPeriod } from '@/types/intelligence';

export function useBudgetIntelligence(householdId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.budget.bundle(householdId ?? 'none'),
    queryFn: () => BudgetRepository.getBundle(householdId!),
    enabled: Boolean(householdId),
    staleTime: 30_000
  });

  useEffect(() => {
    if (!householdId || !userId || !query.data) return;
    void BudgetRepository.syncAlerts(householdId, userId, query.data).then(() =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(householdId, userId) })
    );
  }, [householdId, query.data, queryClient, userId]);

  const update = useMutation({
    mutationFn: (input: {
      categoryId: string;
      budgetAmount: number | null;
      budgetPeriod: BudgetPeriod;
      budgetStartDate?: string | null;
      budgetEndDate?: string | null;
      alertsEnabled?: boolean;
    }) => BudgetRepository.updateCategoryBudget(input.categoryId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.budget.bundle(householdId ?? 'none') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      ]);
    }
  });

  return { ...query, update };
}

