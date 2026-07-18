import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { DashboardInsight } from '../useDashboardSummary';
import { EmptyWidget } from './EmptyWidget';

export function InsightCards({ insights }: { insights: DashboardInsight[] }) {
  if (insights.length === 0) {
    return <EmptyWidget title="No insights yet" message="Add transactions to generate deterministic quick insights." ctaLabel="Add transaction" ctaTo="/transactions" />;
  }

  return (
    <Card className="transition">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Quick Insights</h2>
        <span className="text-[11px] text-muted">Deterministic · no AI</span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insight.tone === 'good' ? CheckCircle2 : insight.tone === 'warning' ? AlertTriangle : Info;
          return (
            <li
              key={insight.id}
              className={cn(
                'rounded-brand border border-border bg-primary/35 p-3',
                insight.tone === 'good' && 'border-success/30',
                insight.tone === 'warning' && 'border-purple/40'
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    insight.tone === 'good' && 'text-success',
                    insight.tone === 'warning' && 'text-purple',
                    insight.tone === 'info' && 'text-accent'
                  )}
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{insight.title}</div>
                  <p className="mt-1 text-xs text-muted">{insight.detail}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
