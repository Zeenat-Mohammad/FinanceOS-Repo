import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { EmptyWidget } from './EmptyWidget';

export function GoalsWidget({
  goals,
  currency
}: {
  goals: Array<{
    id: string;
    name: string;
    target: number;
    current: number;
    completionPct: number;
    projectedCompletionLabel?: string | null;
  }>;
  currency: string;
}) {
  if (goals.length === 0) {
    return <EmptyWidget title="No goals yet" message="Create your first savings goal to track progress here." ctaLabel="Open Goals" ctaTo="/goals" />;
  }

  return (
    <Card className="transition">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Goals Progress</h2>
        <Link to="/goals" className="text-xs font-medium text-accent hover:underline">
          View all →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {goals.slice(0, 4).map((goal) => {
          const pct = Math.min(100, goal.completionPct);
          const ring = [
            { name: 'done', value: pct, fill: 'var(--color-accent-green)' },
            { name: 'left', value: Math.max(0, 100 - pct), fill: 'var(--color-primary)' }
          ];
          return (
            <li key={goal.id} className="flex items-center gap-3 rounded-brand border border-border/50 bg-primary/25 p-2.5">
              <div className="h-12 w-12 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ring} dataKey="value" innerRadius={16} outerRadius={22} startAngle={90} endAngle={-270} stroke="none">
                      {ring.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{goal.name}</span>
                  <span className="text-xs tabular-nums text-muted">{pct.toFixed(0)}%</span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {formatCurrency(goal.current, currency)} / {formatCurrency(goal.target, currency)}
                </div>
                {goal.projectedCompletionLabel ? (
                  <div className="mt-0.5 text-[11px] text-accent">Completes {goal.projectedCompletionLabel}</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
