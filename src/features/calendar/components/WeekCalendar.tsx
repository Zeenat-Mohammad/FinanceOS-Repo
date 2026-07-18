import { format, isToday, parseISO } from 'date-fns';
import type { PaymentInstance } from '@/core/recurring';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import { Card } from '@/shared/components';
import { PaymentBadge } from './PaymentBadge';
import type { CalendarWeekDay } from '../useCalendarWorkspace';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekCalendar({
  days,
  currency,
  selectedDate,
  onSelectDay
}: {
  days: CalendarWeekDay[];
  currency: string;
  selectedDate: string | null;
  onSelectDay: (dateStr: string) => void;
}) {
  return (
    <Card className="overflow-hidden  p-0 backdrop-blur-md">
      <div className="grid grid-cols-7 border-b border-border bg-primary/40">
        {WEEKDAY_LABELS.map((label, index) => {
          const day = days[index];
          const date = day ? parseISO(day.date) : null;
          const today = date ? isToday(date) : false;
          return (
            <div key={label} className="border-r border-border/60 px-2 py-2 text-center last:border-r-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
              {date ? (
                <div
                  className={cn(
                    'mx-auto mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                    today ? 'bg-purple text-white' : 'text-foreground'
                  )}
                >
                  {format(date, 'd')}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid min-h-[24rem] grid-cols-7">
        {days.map((day) => {
          const date = parseISO(day.date);
          const today = isToday(date);
          const selected = selectedDate === day.date;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDay(day.date)}
              className={cn(
                'flex min-h-[24rem] flex-col border-r border-border/60 p-2 text-left transition hover:bg-secondary/15 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/40 last:border-r-0',
                today && 'bg-accent/5',
                selected && 'bg-secondary/20 ring-1 ring-inset ring-accent/50'
              )}
            >
              <div className="space-y-2">
                {day.instances.length === 0 ? (
                  <p className="text-[11px] text-muted">No payments</p>
                ) : (
                  day.instances.map((instance) => (
                    <WeekPaymentItem key={instance.id} instance={instance} currency={currency} />
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function WeekPaymentItem({ instance, currency }: { instance: PaymentInstance; currency: string }) {
  const sign = instance.transaction_type === 'income' ? '+' : '-';

  return (
    <div className="rounded-md border border-border/70 bg-primary/30 p-2">
      <PaymentBadge instance={instance} compact className="w-full" />
      <div className="mt-1 truncate text-[11px] font-medium text-foreground">{instance.name}</div>
      <div
        className={cn(
          'mt-0.5 text-xs tabular-nums',
          instance.transaction_type === 'income' ? 'text-success' : 'text-foreground'
        )}
      >
        {sign}
        {formatCurrency(instance.amount, currency)}
      </div>
    </div>
  );
}
