import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, subMonths } from 'date-fns';
import { MonthlyBudgetRepository } from '@/data/repositories/MonthlyBudgetRepository';
import { queryKeys } from '@/data/query-keys';

export function useMonthlyBudget(householdId?: string, userId?: string, cursor = new Date()) {
  const queryClient = useQueryClient();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const query = useQuery({
    queryKey: queryKeys.budget.month(householdId ?? 'none', year, month),
    queryFn: () => MonthlyBudgetRepository.getBundle(householdId!, userId!, cursor),
    enabled: Boolean(householdId && userId),
    staleTime: 30_000
  });

  const saveRow = useMutation({
    mutationFn: MonthlyBudgetRepository.upsertRow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget', householdId] })
  });

  const copyPrevious = useMutation({
    mutationFn: () => MonthlyBudgetRepository.copyPreviousMonth(householdId!, userId!, cursor),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget', householdId] })
  });

  const archiveMonth = useMutation({
    mutationFn: () => MonthlyBudgetRepository.archiveMonth(householdId!, year, month),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget', householdId] })
  });

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => subMonths(new Date(), index)).map((date) => ({
      label: date.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
      value: `${date.getFullYear()}-${date.getMonth()}`
    }));
  }, []);

  return { query, saveRow, copyPrevious, archiveMonth, monthOptions, cursor: { year, month } };
}

export function parseMonthValue(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month, 1);
}

export function shiftMonth(cursor: Date, delta: number) {
  return addMonths(cursor, delta);
}
