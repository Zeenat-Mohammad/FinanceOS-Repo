import { CheckCircle2, Flag, Sparkles } from 'lucide-react';
import type { TimelineEvent } from '@/core/debt';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export function DebtTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-foreground">Debt Payoff Timeline</h2>
      <p className="mt-1 text-xs text-muted">Milestones for the selected strategy</p>
      <ol className="relative mt-5 space-y-0 border-l border-border pl-5">
        {events.map((event, index) => {
          const isClear = event.kind === 'all_clear';
          const isStart = event.kind === 'start';
          return (
            <li
              key={`${event.kind}-${event.debtId ?? 'x'}-${event.monthIndex}-${index}`}
              className="relative pb-6 last:pb-0 animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
            >
              <span
                className={cn(
                  'absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface',
                  isClear && 'border-success bg-success/20 text-success',
                  isStart && 'border-accent bg-accent/20 text-accent',
                  event.kind === 'paid_off' && 'border-purple bg-purple/20 text-purple'
                )}
              >
                {isClear ? <Sparkles className="h-3 w-3" /> : isStart ? <Flag className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              </span>
              <div className="text-xs font-medium text-accent">{event.label}</div>
              <div className={cn('mt-0.5 text-sm text-foreground', isClear && 'font-semibold text-success')}>
                {event.kind === 'start' && 'Simulation start'}
                {event.kind === 'paid_off' && `${event.debtName} paid off`}
                {event.kind === 'all_clear' && 'All debt paid off!'}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
