import { useNavigate } from 'react-router-dom';
import { format, isSameDay, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import type { PaymentInstance } from '@/core/recurring';
import { Card } from '@/shared/components';
import { useCalendarWeek } from './useCalendarWeek';
import type { CalendarFinancialEvent } from '@/data/repositories/CalendarRepository';

type DayBucket = {
  date: string;
  day: Date;
  instances: PaymentInstance[];
  events?: CalendarFinancialEvent[];
};

function dayDots(instances: PaymentInstance[], events: CalendarFinancialEvent[] = []) {
  const hasIncome = instances.some((i) => i.transaction_type === 'income');
  const hasExpense = instances.some((i) => i.transaction_type === 'expense' || i.transaction_type === 'transfer');
  const hasPending = instances.some((i) => i.status === 'pending' || i.status === 'overdue');
  const hasLedgerIncome = events.some((event) => event.kind === 'income');
  const hasLedgerExpense = events.some((event) => ['expense', 'debt', 'transfer', 'recurring'].includes(event.kind));

  const dots: Array<'income' | 'expense' | 'pending'> = [];
  if (hasPending) dots.push('pending');
  if (hasExpense || hasLedgerExpense) dots.push('expense');
  if (hasIncome || hasLedgerIncome) dots.push('income');
  return dots;
}

export function MiniCalendar({
  householdId,
  days: daysProp,
  onSelectDate
}: {
  householdId?: string;
  days?: DayBucket[];
  onSelectDate?: (date: string) => void;
}) {
  const navigate = useNavigate();
  const weekQuery = useCalendarWeek(householdId);
  const days = daysProp ?? weekQuery.data?.days ?? [];
  const today = new Date();

  const handleSelect = (date: string) => {
    if (onSelectDate) {
      onSelectDate(date);
      return;
    }
    navigate(`/calendar?date=${encodeURIComponent(date)}`);
  };

  if (!householdId) {
    return (
      <Card className="transition">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">This week</div>
        <p className="mt-2 text-xs text-muted">Connect a household to preview your payment calendar.</p>
      </Card>
    );
  }

  if (!daysProp && weekQuery.isLoading) {
    return (
      <Card className="flex min-h-[140px] items-center justify-center transition">
        <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
        <span className="sr-only">Loading week calendar</span>
      </Card>
    );
  }

  return (
    <Card className="transition">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">Week at a glance</div>
          <h2 className="mt-1 text-sm font-semibold text-foreground">
            {format(parseISO(days[0]?.date ?? format(today, 'yyyy-MM-dd')), 'MMM d')} –{' '}
            {format(parseISO(days[days.length - 1]?.date ?? format(today, 'yyyy-MM-dd')), 'MMM d')}
          </h2>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isToday = isSameDay(day.day, today);
          const dots = dayDots(day.instances, day.events);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => handleSelect(day.date)}
              className={cn(
                'flex flex-col items-center rounded-brand px-1 py-2 transition hover:bg-primary/30',
                isToday && 'bg-accent/15 ring-1 ring-accent/50'
              )}
              aria-label={`${format(day.day, 'EEEE, MMMM d')}${day.instances.length || day.events?.length ? `, ${day.instances.length + (day.events?.length ?? 0)} events` : ''}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{format(day.day, 'EEE')}</span>
              <span className={cn('mt-1 text-sm font-semibold tabular-nums', isToday ? 'text-accent' : 'text-foreground')}>
                {format(day.day, 'd')}
              </span>
              <span className="mt-1 flex h-2 items-center justify-center gap-0.5">
                {dots.length === 0 ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-transparent" aria-hidden />
                ) : (
                  dots.map((dot) => (
                    <span
                      key={dot}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        dot === 'income' && 'bg-success',
                        dot === 'expense' && 'bg-purple',
                        dot === 'pending' && 'bg-accent'
                      )}
                      aria-hidden
                    />
                  ))
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted">
        <LegendDot className="bg-accent" label="Pending" />
        <LegendDot className="bg-purple" label="Expense" />
        <LegendDot className="bg-success" label="Income" />
      </div>
    </Card>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', className)} aria-hidden />
      {label}
    </span>
  );
}
