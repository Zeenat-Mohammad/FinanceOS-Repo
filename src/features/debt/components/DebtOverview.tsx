import type { LucideIcon } from 'lucide-react';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import { AnimatedCounter } from './AnimatedCounter';

export function DebtOverviewCard({
  label,
  value,
  display,
  trend,
  tooltip,
  icon: Icon,
  isMoney,
  currency = 'USD',
  decimals,
  suffix
}: {
  label: string;
  value?: number;
  display?: string;
  trend?: string;
  tooltip?: string;
  icon: LucideIcon;
  isMoney?: boolean;
  currency?: string;
  decimals?: number;
  suffix?: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition duration-300 hover:border-accent/40" title={tooltip}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-accent/5 opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {display != null ? (
              display
            ) : (
              <AnimatedCounter value={value ?? 0} isMoney={isMoney} currency={currency} decimals={decimals} suffix={suffix} />
            )}
          </div>
          {trend ? <div className={cn('mt-2 text-xs', trend.startsWith('↓') || trend.includes('sooner') || trend.includes('saved') ? 'text-success' : 'text-muted')}>{trend}</div> : null}
        </div>
        <div className="rounded-brand bg-primary/80 p-2 text-accent">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
