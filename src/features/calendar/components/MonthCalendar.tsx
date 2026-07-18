import {
  addDays,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import type { CalendarDayBucket } from '@/data/repositories/CalendarRepository';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import { Card } from '@/shared/components';
import { resolvePaymentBadgeTone } from './PaymentBadge';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_VISIBLE = 3;

const chipToneClasses = {
  income: 'border-success/25 bg-success/10 text-success',
  expense: 'border-purple/25 bg-purple/10 text-purple',
  pending: 'border-accent/25 bg-accent/10 text-accent',
  overdue: 'border-destructive/30 bg-destructive/10 text-destructive',
  paid: 'border-success/15 bg-success/5 text-success/70',
  skipped: 'border-border bg-surface-muted/30 text-muted'
} as const;

function buildMonthGrid(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function MonthCalendar({
  anchor,
  dayMap,
  currency,
  selectedDate,
  onSelectDay
}: {
  anchor: Date;
  dayMap: Map<string, CalendarDayBucket>;
  currency: string;
  selectedDate: string | null;
  onSelectDay: (dateStr: string) => void;
}) {
  const gridDays = buildMonthGrid(anchor);

  return (
    <Card className="overflow-hidden  p-0 backdrop-blur-md">
      <div className="grid grid-cols-7 border-b border-border bg-primary/40">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {gridDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const bucket = dayMap.get(dateStr);
          const instances = bucket?.instances ?? [];
          const visible = instances.slice(0, MAX_VISIBLE);
          const overflow = instances.length - visible.length;
          const inMonth = isSameMonth(day, anchor);
          const today = isToday(day);
          const selected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDay(dateStr)}
              className={cn(
                'min-h-[7.5rem] border-b border-r border-border/60 p-2 text-left transition hover:bg-secondary/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/40',
                !inMonth && 'bg-primary/20 text-muted',
                selected && 'bg-secondary/25 ring-1 ring-inset ring-accent/50'
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                    today && 'bg-purple text-white',
                    !today && inMonth && 'text-foreground',
                    !today && !inMonth && 'text-muted'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {instances.length > 0 ? (
                  <span className="text-[10px] tabular-nums text-muted">{instances.length}</span>
                ) : null}
              </div>

              <div className="mt-1 space-y-1">
                {visible.map((instance) => {
                  const tone = resolvePaymentBadgeTone(instance);
                  return (
                    <div
                      key={instance.id}
                      className={cn(
                        'truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight',
                        chipToneClasses[tone]
                      )}
                      title={`${instance.name} · ${formatCurrency(instance.amount, currency)}`}
                    >
                      <span className="font-medium">{instance.name}</span>
                      <span className="ml-1 tabular-nums opacity-90">{formatCurrency(instance.amount, currency)}</span>
                    </div>
                  );
                })}
                {overflow > 0 ? (
                  <div className="flex items-center gap-0.5 pt-0.5" aria-label={`${overflow} more payments`}>
                    {Array.from({ length: Math.min(overflow, 4) }).map((_, index) => (
                      <span key={index} className="h-1.5 w-1.5 rounded-full bg-accent/80" />
                    ))}
                    {overflow > 4 ? <span className="text-[10px] text-muted">+{overflow - 4}</span> : null}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
