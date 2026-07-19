import { useState } from 'react';
import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { Button, Card, Modal } from '@/shared/components';

const HEALTH_TIPS: Record<string, string> = {
  Budget: 'Keep category spending within monthly allocations. Review overspent categories in Budget.',
  Savings: 'Automate transfers to sinking funds and emergency reserves each payday.',
  Debt: 'Use avalanche for interest savings or snowball for momentum — pick one strategy in Debt Center.',
  Investments: 'Track holdings in Net Worth and rebalance when allocations drift from targets.',
  'Emergency Fund': 'Aim for 3–6 months of essential expenses in liquid accounts.',
  'Cash Flow': 'Income minus expenses should stay positive; trim discretionary spend if cash flow tightens.'
};

export function FinancialHealthCard({
  score,
  breakdown
}: {
  score: number;
  breakdown: {
    overall: number;
    budget: number;
    savings: number;
    debt: number;
    investments: number;
    emergency: number;
    cashFlow: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const data = [{ name: 'score', value: score, fill: 'var(--color-accent-green)' }];
  const rows = [
    { label: 'Budget', value: breakdown.budget },
    { label: 'Savings', value: breakdown.savings },
    { label: 'Debt', value: breakdown.debt },
    { label: 'Investments', value: breakdown.investments },
    { label: 'Emergency Fund', value: breakdown.emergency },
    { label: 'Cash Flow', value: breakdown.cashFlow }
  ];

  const message =
    score >= 75 ? "Good job! You're on track." : score >= 55 ? 'Solid foundation — a few levers to improve.' : 'Needs attention — start with cash flow and debt.';

  return (
    <>
      <Card className="transition">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Financial Health</h2>
            <p className="mt-1 text-xs text-muted">{message}</p>
          </div>
          <Button
            type="button"
            className="h-8 border border-border bg-transparent px-2.5 text-xs text-foreground hover:bg-secondary"
            onClick={() => setOpen(true)}
          >
            View more
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr] md:items-center">
          <div className="relative mx-auto h-36 w-36">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" background={{ fill: 'var(--color-primary)' }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-2xl font-semibold tabular-nums text-foreground">{Math.round(score)}</div>
                <div className="text-[10px] text-muted">/ 100</div>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="rounded-md border border-border/60 bg-primary/30 px-3 py-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{row.label}</span>
                  <span className="tabular-nums text-foreground">{Math.round(row.value)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-700" style={{ width: `${Math.min(100, row.value)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Modal open={open} title="Financial Health breakdown" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Composite score {Math.round(score)}/100 — derived from budget discipline, savings rate, debt load, investments, emergency coverage, and cash flow.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="rounded-md border border-border/60 bg-primary/20 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="tabular-nums text-accent">{Math.round(row.value)}/100</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-success" style={{ width: `${Math.min(100, row.value)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">{HEALTH_TIPS[row.label]}</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
