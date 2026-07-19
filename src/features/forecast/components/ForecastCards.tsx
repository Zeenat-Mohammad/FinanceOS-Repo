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
  const predictedText = displayPredicted ?? predicted;

  return (
    <Card className="relative min-h-[172px] overflow-hidden p-5 shadow-card backdrop-blur-md transition hover:border-accent/40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/25 via-transparent to-accent/10" />
      <div className="relative flex h-full min-w-0 flex-col">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 pr-2 text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-brand bg-primary/80 text-accent">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="max-w-full break-words text-[clamp(1.25rem,2vw,1.75rem)] font-semibold leading-tight tracking-tight text-foreground"
            title={predictedText}
          >
            {predictedText}
          </div>
          <div className="mt-2 max-w-full break-words text-xs leading-relaxed text-muted" title={`Now ${current}`}>
            Now {current}
          </div>
          {changePct != null ? (
            <div className={cn('mt-2 text-xs font-medium', positive ? 'text-success' : 'text-destructive')}>
              {positive ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-start">
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
