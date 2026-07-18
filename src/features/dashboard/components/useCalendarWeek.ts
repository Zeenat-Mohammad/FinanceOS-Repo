import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { CalendarRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';

export function useCalendarWeek(householdId?: string, anchor = new Date()) {
  const weekKey = format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.calendar.week(householdId ?? 'none', weekKey),
    enabled: Boolean(householdId),
    queryFn: () => CalendarRepository.getWeek(householdId!, anchor),
    staleTime: 20_000
  });
}
