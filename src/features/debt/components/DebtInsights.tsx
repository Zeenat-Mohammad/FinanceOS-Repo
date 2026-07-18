import { Lightbulb } from 'lucide-react';
import type { DebtInsight } from '@/core/debt';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export function DebtInsights({ insights }: { insights: DebtInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-foreground">Recommendations</h2>
      <p className="mt-1 text-xs text-muted">Deterministic insights from your simulation — no AI</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className={cn(
              'rounded-brand border border-border bg-primary/40 p-3',
              insight.severity === 'positive' && 'border-success/30',
              insight.severity === 'warning' && 'border-purple/40'
            )}
          >
            <div className="flex items-start gap-2">
              <Lightbulb
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  insight.severity === 'positive' && 'text-success',
                  insight.severity === 'warning' && 'text-purple',
                  insight.severity === 'info' && 'text-accent'
                )}
              />
              <div>
                <div className="text-sm font-medium text-foreground">{insight.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{insight.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
