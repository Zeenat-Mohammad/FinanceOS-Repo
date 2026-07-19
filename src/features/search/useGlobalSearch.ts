import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlobalSearchService } from '@/core/search/GlobalSearchService';
import { SearchRepository } from '@/data/repositories/SearchRepository';
import { queryKeys } from '@/data/query-keys';

export function useGlobalSearch(
  householdId?: string,
  userId?: string,
  query = '',
  enabled = true,
  currency = 'USD'
) {
  const trimmed = query.trim();

  const searchQuery = useQuery({
    queryKey: queryKeys.search.global(householdId ?? 'none', trimmed),
    queryFn: () => SearchRepository.search(householdId!, userId!, trimmed, currency),
    enabled: enabled && Boolean(householdId && userId && trimmed.length >= 2),
    staleTime: 30_000,
    gcTime: 5 * 60_000
  });

  const grouped = useMemo(
    () => GlobalSearchService.group(searchQuery.data ?? []),
    [searchQuery.data]
  );

  return { ...searchQuery, grouped, flat: searchQuery.data ?? [] };
}
