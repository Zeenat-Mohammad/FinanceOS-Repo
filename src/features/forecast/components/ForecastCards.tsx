import type { LucideIcon } from 'lucide-react';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { ConfidenceLevel } from '@/core/forecast';

export function ForecastCard({
  label,
  current,
  predicted,
  changePct,
  confidence,
  icon: Icon,
  displayPredicted
}: {
  label: string;
  current: string;
  predicted: string;
  changePct?: number;
  confidence: ConfidenceLevel;
  icon: LucideIcon;
  displayPredicted?: string;
}) {
  const positive = (changePct ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden  shadow-card backdrop-blur-md transition hover:border-accent/40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/25 via-transparent to-accent/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
          <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{displayPredicted ?? predicted}</div>
          <div className="mt-1 text-xs text-muted">Now {current}</div>
          {changePct != null ? (
            <div className={cn('mt-2 text-xs font-medium', positive ? 'text-success' : 'text-destructive')}>
              {positive ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-brand bg-primary/80 p-2 text-accent">
            <Icon className="h-4 w-4" />
          </div>
          <ConfidencePill level={confidence} />
        </div>
      </div>
    </Card>
  );
}

export function ConfidencePill({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        level === 'high' && 'bg-success/15 text-success',
        level === 'medium' && 'bg-accent/15 text-accent',
        level === 'low' && 'bg-purple/20 text-purple'
      )}
    >
      {level}
    </span>
  );
}
