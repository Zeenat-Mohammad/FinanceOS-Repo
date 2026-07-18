import { Archive, FolderTree, HelpCircle, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/shared/components';
import { DashboardCounter } from '@/features/dashboard/components/DashboardCounter';

export function CategoryStats({
  stats
}: {
  stats: {
    total: number;
    income: number;
    expense: number;
    archived: number;
    mostUsedName: string;
    mostUsedCount: number;
    uncategorized: number;
  };
}) {
  const cards = [
    { label: 'Total Categories', value: stats.total, hint: 'Active groups', icon: FolderTree },
    { label: 'Income Categories', value: stats.income, hint: 'Money in', icon: TrendingUp },
    { label: 'Expense Categories', value: stats.expense, hint: 'Money out', icon: TrendingDown },
    { label: 'Archived Categories', value: stats.archived, hint: 'Hidden from grid', icon: Archive },
    { label: 'Most Used', value: stats.mostUsedCount, hint: stats.mostUsedName, icon: PiggyBank, display: stats.mostUsedName },
    { label: 'Uncategorized', value: stats.uncategorized, hint: 'Need attention', icon: HelpCircle }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Category statistics">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="relative overflow-hidden transition transition hover:border-accent/40">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-accent/10" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{card.label}</div>
                <div className="mt-2 truncate text-xl font-semibold tabular-nums text-foreground">
                  {card.display ? card.display : <DashboardCounter value={card.value} />}
                </div>
                <div className="mt-1 truncate text-xs text-muted">{card.hint}</div>
              </div>
              <div className="rounded-brand bg-primary/80 p-2 text-accent">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
