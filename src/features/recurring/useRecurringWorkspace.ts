import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AccountsRepository, CategoriesRepository, RecurringRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { PaymentEngine, type RecurringKind } from '@/core/recurring';
import type { PaymentInstance } from '@/data/repositories/RecurringRepository';

export type RecurringStatusTab = 'current' | 'paused' | 'completed';
export type RecurringFilter = 'all' | 'income' | 'expense' | 'subscription' | 'bill' | 'debt' | 'savings';
export type RecurringSort = 'next_due' | 'amount' | 'name';
export type RecurringView = 'grid' | 'list';

export function useRecurringWorkspace(householdId?: string) {
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<RecurringStatusTab>('current');
  const [filter, setFilter] = useState<RecurringFilter>('all');
  const [sort, setSort] = useState<RecurringSort>('next_due');
  const [view, setView] = useState<RecurringView>('grid');

  const rangeKey = format(new Date(), 'yyyy-MM');

  const workspaceQuery = useQuery({
    queryKey: queryKeys.recurring.workspace(householdId ?? 'none'),
    enabled: Boolean(householdId),
    queryFn: async () => {
      const [rules, accounts, categories] = await Promise.all([
        RecurringRepository.listRules(),
        AccountsRepository.list(),
        CategoriesRepository.list()
      ]);
      const instances = await RecurringRepository.ensureHorizon(householdId!, rules, 3);
      const stats = PaymentEngine.computeRecurringStats(rules, instances);
      const insights = PaymentEngine.reminderInsights(instances, rules);
      return { rules, accounts, categories, instances, stats, insights };
    },
    staleTime: 20_000
  });

  const enriched = useMemo(() => {
    const data = workspaceQuery.data;
    if (!data) return [];
    const accountMap = new Map(data.accounts.map((a) => [a.id, a]));
    const categoryMap = new Map(data.categories.map((c) => [c.id, c]));

    return data.rules
      .filter((r) => !r.deleted_at)
      .map((rule) => {
        const meta = PaymentEngine.getRecurringMeta(rule);
        const nextInstance = data.instances
          .filter((i) => i.recurring_rule_id === rule.id && (i.status === 'pending' || i.status === 'overdue'))
          .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
        return {
          rule,
          meta,
          accountName: rule.account_id ? accountMap.get(rule.account_id)?.name ?? '—' : '—',
          categoryName: rule.category_id ? categoryMap.get(rule.category_id)?.name ?? '—' : '—',
          nextDue: rule.next_occurrence_on ?? nextInstance?.scheduled_date ?? rule.starts_on,
          nextInstance: nextInstance ?? null,
          statusLabel:
            rule.status === 'ended'
              ? 'Completed'
              : rule.status === 'paused'
                ? 'Paused'
                : nextInstance?.status === 'overdue'
                  ? 'Overdue'
                  : nextInstance && daysUntil(nextInstance.scheduled_date) <= 3
                    ? 'Due Soon'
                    : 'Active'
        };
      });
  }, [workspaceQuery.data]);

  const tabCounts = useMemo(() => {
    return {
      current: enriched.filter((i) => i.rule.status === 'active').length,
      paused: enriched.filter((i) => i.rule.status === 'paused').length,
      completed: enriched.filter((i) => i.rule.status === 'ended').length
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    let list = [...enriched];

    list = list.filter((item) => {
      if (statusTab === 'current') return item.rule.status === 'active';
      if (statusTab === 'paused') return item.rule.status === 'paused';
      return item.rule.status === 'ended';
    });

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((item) => item.rule.name.toLowerCase().includes(q) || item.categoryName.toLowerCase().includes(q));

    list = list.filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'income') return item.rule.transaction_type === 'income';
      if (filter === 'expense') return item.rule.transaction_type === 'expense';
      if (filter === 'subscription') return item.meta.kind === 'subscription';
      if (filter === 'bill') return item.meta.kind === 'bill';
      if (filter === 'debt') return item.meta.kind === 'debt';
      if (filter === 'savings') return item.meta.kind === 'savings';
      return true;
    });

    list.sort((a, b) => {
      if (sort === 'amount') return (b.rule.amount ?? 0) - (a.rule.amount ?? 0);
      if (sort === 'name') return a.rule.name.localeCompare(b.rule.name);
      return a.nextDue.localeCompare(b.nextDue);
    });
    return list;
  }, [enriched, search, filter, sort, statusTab]);

  return {
    workspaceQuery,
    enriched,
    filtered,
    tabCounts,
    stats: workspaceQuery.data?.stats,
    insights: workspaceQuery.data?.insights ?? [],
    accounts: workspaceQuery.data?.accounts ?? [],
    categories: workspaceQuery.data?.categories ?? [],
    instances: workspaceQuery.data?.instances ?? ([] as PaymentInstance[]),
    search,
    setSearch,
    statusTab,
    setStatusTab,
    filter,
    setFilter,
    sort,
    setSort,
    view,
    setView,
    rangeKey,
    isLoading: workspaceQuery.isLoading
  };
}

function daysUntil(date: string) {
  const due = new Date(date);
  const today = new Date();
  return Math.ceil((due.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
}

export type EnrichedRecurring = ReturnType<typeof useRecurringWorkspace>['enriched'][number];
export type { RecurringKind };
