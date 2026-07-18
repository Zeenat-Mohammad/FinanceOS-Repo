import { WHAT_IF_CARDS, type WhatIfId } from '@/core/forecast';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export function WhatIfPanel({
  active,
  onToggle
}: {
  active: WhatIfId[];
  onToggle: (id: WhatIfId) => void;
}) {
  return (
    <Card className="transition">
      <h2 className="text-sm font-semibold text-foreground">What If</h2>
      <p className="mt-1 text-xs text-muted">Interactive shocks — every card instantly recalculates forecasts.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WHAT_IF_CARDS.map((card) => {
          const on = active.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={cn(
                'rounded-brand border p-3 text-left transition',
                on ? 'border-success/50 bg-success/10' : 'border-border bg-primary/40 hover:border-accent/40'
              )}
              onClick={() => onToggle(card.id)}
            >
              <div className="text-sm font-medium text-foreground">{card.title}</div>
              <p className="mt-1 text-xs text-muted">{card.description}</p>
              <div className={cn('mt-2 text-[10px] font-semibold uppercase tracking-wide', on ? 'text-success' : 'text-muted')}>
                {on ? 'Active' : 'Tap to simulate'}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
