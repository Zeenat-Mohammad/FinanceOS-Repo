import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CategoriesRepository } from '@/data/repositories';
import { TransactionsRepository } from '@/data/repositories/TransactionsRepository';
import { queryKeys } from '@/data/query-keys';
import { countUncategorized, enrichCategories, loadLookbackWindow, type EnrichedCategory } from './categoryEnrichment';

export type CategoryTypeFilter = 'all' | 'income' | 'expense' | 'transfer' | 'archived';
export type CategorySort = 'alpha' | 'recent' | 'most_used' | 'highest' | 'lowest';
export type GridSize = 'small' | 'medium' | 'large';

export function useCategoryWorkspace() {
  const window = loadLookbackWindow();
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: CategoriesRepository.list
  });
  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions.byPeriod(window.start, window.end),
    queryFn: () => TransactionsRepository.listByPeriod(window.start, window.end),
    staleTime: 30_000
  });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CategoryTypeFilter>('all');
  const [sort, setSort] = useState<CategorySort>('alpha');
  const [gridSize, setGridSize] = useState<GridSize>('medium');

  const enriched = useMemo(
    () => enrichCategories(categoriesQuery.data ?? [], transactionsQuery.data ?? []),
    [categoriesQuery.data, transactionsQuery.data]
  );

  const active = useMemo(() => enriched.filter((c) => !c.archived), [enriched]);
  const archived = useMemo(() => enriched.filter((c) => c.archived), [enriched]);

  const filtered = useMemo(() => {
    let list: EnrichedCategory[] =
      typeFilter === 'archived'
        ? archived
        : typeFilter === 'all'
          ? active
          : active.filter((c) => c.type === typeFilter || (typeFilter === 'expense' && ['expense', 'refund', 'adjustment'].includes(c.type)));

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));

    const sorted = [...list];
    switch (sort) {
      case 'recent':
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case 'most_used':
        sorted.sort((a, b) => b.usage.transactionCount - a.usage.transactionCount);
        break;
      case 'highest':
        sorted.sort((a, b) => b.usage.totalAmount - a.usage.totalAmount);
        break;
      case 'lowest':
        sorted.sort((a, b) => a.usage.totalAmount - b.usage.totalAmount);
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [active, archived, search, typeFilter, sort]);

  const mostUsed = useMemo(() => {
    return [...active].sort((a, b) => b.usage.transactionCount - a.usage.transactionCount)[0] ?? null;
  }, [active]);

  const stats = {
    total: active.length,
    income: active.filter((c) => c.type === 'income').length,
    expense: active.filter((c) => c.type === 'expense' || c.type === 'refund' || c.type === 'adjustment').length,
    archived: archived.length,
    mostUsedName: mostUsed?.name ?? '—',
    mostUsedCount: mostUsed?.usage.transactionCount ?? 0,
    uncategorized: countUncategorized(transactionsQuery.data ?? [])
  };

  return {
    categoriesQuery,
    transactionsQuery,
    enriched,
    active,
    archived,
    filtered,
    stats,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    sort,
    setSort,
    gridSize,
    setGridSize,
    isLoading: categoriesQuery.isLoading || transactionsQuery.isLoading
  };
}
