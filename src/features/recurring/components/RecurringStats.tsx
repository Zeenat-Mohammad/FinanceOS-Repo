import { AlertCircle, CalendarClock, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/shared/components';
import { DashboardCounter } from '@/features/dashboard/components/DashboardCounter';
import type { RecurringStats as RecurringStatsType } from '@/core/recurring';

export function RecurringStats({ stats, currency }: { stats: RecurringStatsType; currency: string }) {
  const cards = [
    {
      label: 'Monthly Recurring Expenses',
      money: stats.monthlyExpense,
      hint: `${stats.expenseCount} active bills`,
      icon: TrendingDown
    },
    {
      label: 'Monthly Recurring Income',
      money: stats.monthlyIncome,
      hint: `${stats.incomeCount} income streams`,
      icon: TrendingUp
    },
    {
      label: 'Upcoming Payments',
      count: stats.upcoming7Count,
      hint: 'Next 7 days',
      icon: CalendarClock,
      amount: stats.upcoming7Amount
    },
    {
      label: 'Overdue Payments',
      count: stats.overdueCount,
      hint: stats.overdueCount > 0 ? 'Needs attention' : 'All caught up',
      icon: AlertCircle,
      amount: stats.overdueAmount,
      danger: stats.overdueCount > 0
    },
    {
      label: 'Active Subscriptions',
      count: stats.activeSubscriptions,
      hint: 'Recurring services',
      icon: Repeat
    }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" aria-label="Recurring payment statistics">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="relative overflow-hidden transition">
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{card.label}</div>
                <div className={`mt-2 truncate text-lg font-semibold tabular-nums ${card.danger ? 'text-destructive' : 'text-foreground'}`}>
                  {'money' in card && card.money !== undefined ? (
                    <DashboardCounter value={card.money} isMoney currency={currency} />
                  ) : (
                    <DashboardCounter value={card.count ?? 0} />
                  )}
                </div>
                <div className="mt-1 text-xs leading-snug text-muted">
                  {'amount' in card && card.amount !== undefined && card.amount > 0 ? (
                    <>
                      <span className="block">{card.hint}</span>
                      <span className="mt-0.5 block tabular-nums">
                        <DashboardCounter value={card.amount} isMoney currency={currency} />
                      </span>
                    </>
                  ) : (
                    <span className="block">{card.hint}</span>
                  )}
                </div>
              </div>
              <div className="rounded-brand bg-primary p-2 text-accent">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
