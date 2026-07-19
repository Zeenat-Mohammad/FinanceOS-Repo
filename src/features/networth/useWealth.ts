import { useQuery } from '@tanstack/react-query';
import { WealthRepository } from '@/data/repositories/WealthRepository';
import { queryKeys } from '@/data/query-keys';

export function useWealthSummary(householdId?: string) {
  return useQuery({
    queryKey: queryKeys.wealth.summary(householdId ?? 'none'),
    queryFn: () => WealthRepository.getDashboardSummary(householdId!),
    enabled: Boolean(householdId),
    staleTime: 60_000
  });
}
