import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GoalsRepository, NotificationRepository, type SmartGoalInput } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import type { GoalContribution } from '@/types/intelligence';

export function useGoals(householdId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.goals.bundle(householdId ?? 'none'),
    queryFn: () => GoalsRepository.getBundle(householdId!),
    enabled: Boolean(householdId),
    staleTime: 30_000
  });

  useEffect(() => {
    if (!householdId || !userId || !query.data) return;
    void NotificationRepository.syncGoalAlerts(householdId, userId, query.data).then(() =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(householdId, userId) })
    );
  }, [householdId, query.data, queryClient, userId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.bundle(householdId ?? 'none') });
  const create = useMutation({ mutationFn: (input: SmartGoalInput) => GoalsRepository.create(input), onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<SmartGoalInput, 'household_id' | 'user_id'>> }) =>
      GoalsRepository.update(id, input),
    onSuccess: invalidate
  });
  const contribute = useMutation({
    mutationFn: (input: {
      goalId: string;
      amount: number;
      source?: GoalContribution['source'];
      notes?: string | null;
      accountId?: string | null;
    }) => GoalsRepository.recordContribution(input),
    onSuccess: invalidate
  });

  return { ...query, create, update, contribute };
}

