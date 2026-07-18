import { Activity, PiggyBank, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import { DashboardCounter } from './DashboardCounter';
import { Sparkline } from './Sparkline';

type HeroMetric = {
  value: number;
  previous: number;
  trend: number;
  sparkline: number[];
};

export function HeroCards({
  hero,
  currency
}: {
  hero: {
    netWorth: HeroMetric;
    cashAvailable: HeroMetric;
    monthlySpending: HeroMetric;
    monthlySavings: HeroMetric;
    healthScore: HeroMetric;
  };
  currency: string;
}) {
  const cards: Array<{
    key: string;
    label: string;
    metric: HeroMetric;
    icon: LucideIcon;
    isMoney: boolean;
    tone: 'green' | 'purple' | 'teal' | 'red';
    suffix?: string;
  }> = [
    { key: 'nw', label: 'Current Net Worth', metric: hero.netWorth, icon: TrendingUp, isMoney: true, tone: 'purple' },
    { key: 'cash', label: 'Cash Available', metric: hero.cashAvailable, icon: Wallet, isMoney: true, tone: 'teal' },
    { key: 'spend', label: 'Monthly Spending', metric: hero.monthlySpending, icon: ShoppingCart, isMoney: true, tone: 'red' },
    { key: 'save', label: 'Monthly Savings', metric: hero.monthlySavings, icon: PiggyBank, isMoney: true, tone: 'green' },
    { key: 'health', label: 'Financial Health Score', metric: hero.healthScore, icon: Activity, isMoney: false, tone: 'green', suffix: '/100' }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Hero summary">
      {cards.map((card) => {
        const Icon = card.icon;
        const up = card.metric.trend >= 0;
        const healthPct = card.key === 'health' ? Math.min(100, Math.max(0, card.metric.value)) : null;

        return (
          <Card key={card.key} title={`${card.label}: was ${card.metric.previous.toFixed(0)} last period`} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{card.label}</div>
                <div className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  <DashboardCounter
                    value={card.metric.value}
                    isMoney={card.isMoney}
                    currency={currency}
                    suffix={card.suffix}
                  />
                </div>
              </div>
              <div
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-brand',
                  card.tone === 'purple' && 'bg-purple/15 text-purple',
                  card.tone === 'teal' && 'bg-accent/15 text-accent',
                  card.tone === 'red' && 'bg-destructive/10 text-destructive',
                  card.tone === 'green' && 'bg-success/20 text-success'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div
              className={cn(
                'inline-flex w-fit items-center rounded-md px-2 py-1 text-xs font-semibold',
                up ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive'
              )}
            >
              {up ? '↑' : '↓'} {Math.abs(card.metric.trend).toFixed(1)}% vs last month
            </div>

            {healthPct !== null ? (
              <div>
                <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-muted">
                  <span>Score</span>
                  <span className="tabular-nums">{healthPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-primary">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      healthPct >= 70 ? 'bg-success' : healthPct >= 40 ? 'bg-accent' : 'bg-destructive'
                    )}
                    style={{ width: `${healthPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-auto">
                <Sparkline values={card.metric.sparkline} tone={card.tone} />
              </div>
            )}
          </Card>
        );
      })}
    </section>
  );
}
