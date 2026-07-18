import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addMonths, addWeeks, format, parseISO, startOfWeek, subMonths, subWeeks } from 'date-fns';
import { CalendarRepository, type CalendarDayBucket } from '@/data/repositories/CalendarRepository';
import { queryKeys } from '@/data/query-keys';
import type { PaymentInstance } from '@/core/recurring';
import type { RecurringRule } from '@/types/database';

export type CalendarView = 'month' | 'week';

export function useCalendarWorkspace(householdId?: string, initialDate?: string | null) {
  const [anchor, setAnchor] = useState(() => (initialDate ? parseISO(initialDate) : new Date()));
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);

  const monthKey = format(anchor, 'yyyy-MM');
  const weekKey = format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const monthQuery = useQuery({
    queryKey: queryKeys.calendar.month(householdId ?? 'none', monthKey),
    enabled: Boolean(householdId),
    queryFn: () => CalendarRepository.getMonth(householdId!, anchor),
    staleTime: 20_000
  });

  const weekQuery = useQuery({
    queryKey: queryKeys.calendar.week(householdId ?? 'none', weekKey),
    enabled: Boolean(householdId),
    queryFn: () => CalendarRepository.getWeek(householdId!, anchor),
    staleTime: 20_000
  });

  const activeQuery = view === 'month' ? monthQuery : weekQuery;
  const rules = activeQuery.data?.rules ?? monthQuery.data?.rules ?? weekQuery.data?.rules ?? [];

  const rulesMap = useMemo(() => new Map(rules.map((rule) => [rule.id, rule])), [rules]);

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDayBucket>();
    for (const day of monthQuery.data?.days ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [monthQuery.data?.days]);

  const weekDays = useMemo(
    () =>
      (weekQuery.data?.days ?? []).map((day) => ({
        date: day.date,
        instances: day.instances
      })),
    [weekQuery.data?.days]
  );

  const instances = activeQuery.data?.instances ?? [];
  const monthDays = monthQuery.data?.days ?? [];

  const selectedInstances = useMemo(() => {
    if (!selectedDate) return [] as PaymentInstance[];
    return instances.filter((instance) => instance.scheduled_date === selectedDate);
  }, [instances, selectedDate]);

  const goPrev = () => {
    setAnchor((current) => (view === 'month' ? subMonths(current, 1) : subWeeks(current, 1)));
  };

  const goNext = () => {
    setAnchor((current) => (view === 'month' ? addMonths(current, 1) : addWeeks(current, 1)));
  };

  const goToday = () => {
    setAnchor(new Date());
  };

  const selectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const clearSelectedDay = () => {
    setSelectedDate(null);
  };

  return {
    anchor,
    view,
    setView,
    selectedDate,
    selectDay,
    clearSelectedDay,
    monthQuery,
    weekQuery,
    activeQuery,
    rules,
    rulesMap,
    days: view === 'month' ? monthDays : weekDays,
    dayMap,
    weekDays,
    monthDays,
    instances,
    selectedInstances,
    goPrev,
    goNext,
    goToday,
    monthKey,
    weekKey,
    isLoading: view === 'month' ? monthQuery.isLoading : weekQuery.isLoading,
    isFetching: view === 'month' ? monthQuery.isFetching : weekQuery.isFetching
  };
}

export type CalendarWeekDay = { date: string; instances: PaymentInstance[] };
export type CalendarRulesMap = Map<string, RecurringRule>;
