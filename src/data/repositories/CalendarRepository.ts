import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { RecurringRepository, type PaymentInstance } from './RecurringRepository';
import { PaymentEngine } from '@/core/recurring';
import type { RecurringRule } from '@/types/database';

export type CalendarDayBucket = {
  date: string;
  instances: PaymentInstance[];
  incomeCount: number;
  expenseCount: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
};

export const CalendarRepository = {
  async getMonth(householdId: string, anchor: Date): Promise<{
    rules: RecurringRule[];
    instances: PaymentInstance[];
    days: CalendarDayBucket[];
  }> {
    const rules = await RecurringRepository.listRules();
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    const instances = await RecurringRepository.ensureHorizon(householdId, rules, 2);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const monthInstances = instances.filter((i) => i.scheduled_date >= startStr && i.scheduled_date <= endStr);

    const byDate = new Map<string, PaymentInstance[]>();
    for (const instance of monthInstances) {
      const list = byDate.get(instance.scheduled_date) ?? [];
      list.push(instance);
      byDate.set(instance.scheduled_date, list);
    }

    const days: CalendarDayBucket[] = [];
    let cursor = start;
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd');
      const list = byDate.get(key) ?? [];
      days.push({
        date: key,
        instances: list,
        incomeCount: list.filter((i) => i.transaction_type === 'income').length,
        expenseCount: list.filter((i) => i.transaction_type === 'expense').length,
        pendingCount: list.filter((i) => i.status === 'pending').length,
        overdueCount: list.filter((i) => i.status === 'overdue').length,
        paidCount: list.filter((i) => i.status === 'paid').length
      });
      cursor = addDays(cursor, 1);
    }

    return { rules, instances: monthInstances, days };
  },

  async getWeek(householdId: string, anchor: Date) {
    const rules = await RecurringRepository.listRules();
    const instances = await RecurringRepository.ensureHorizon(householdId, rules, 2);
    const weekInstances = PaymentEngine.instancesForWeek(instances, anchor);
    const days = PaymentEngine.weekDays(anchor).map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const list = weekInstances.filter((i) => i.scheduled_date === key);
      return { date: key, day, instances: list };
    });
    return { rules, instances: weekInstances, days };
  }
};
