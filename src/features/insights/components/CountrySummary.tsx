import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { IndicatorCard } from '@/types/insights';
import { cn } from '@/core/utils/cn';

export function InsightsSection({
  id,
  title,
  subtitle,
  action,
  children
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function GlassPanel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('insights-glass p-4 sm:p-5', className)}>{children}</div>;
}

export function CountrySummary({ indicators, currency }: { indicators: IndicatorCard[]; currency: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {indicators.map((card) => (
        <GlassPanel key={card.id} className="relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                {typeof card.value === 'number'
                  ? card.unit === '%'
                    ? `${card.value.toFixed(1)}%`
                    : card.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : card.value}
                {card.unit && card.unit !== '%' ? <span className="ml-1 text-xs text-muted">{card.unit || currency}</span> : null}
              </p>
              <p className="mt-1 text-xs text-muted">Prev {String(card.previous)}</p>
            </div>
            <TrendPill trend={card.trend} label={card.changeLabel} />
          </div>
          <div className="mt-3 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={card.sparkline}>
                <Area type="monotone" dataKey="value" stroke="var(--color-accent-teal)" fill="var(--color-accent-teal)" fillOpacity={0.2} strokeWidth={2} isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}

function TrendPill({ trend, label }: { trend: 'up' | 'down' | 'flat'; label: string }) {
  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium',
        trend === 'up' && 'bg-[rgba(182,215,168,0.18)] text-[var(--color-accent-green)]',
        trend === 'down' && 'bg-[rgba(239,68,68,0.15)] text-red-300',
        trend === 'flat' && 'bg-white/5 text-muted'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
