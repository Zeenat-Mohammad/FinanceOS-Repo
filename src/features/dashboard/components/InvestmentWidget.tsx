import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { EmptyWidget } from './EmptyWidget';

export function InvestmentWidget({
  investments,
  currency
}: {
  investments: {
    total: number;
    allocation: Array<{ name: string; value: number; color: string }>;
  };
  currency: string;
}) {
  if (investments.total <= 0) {
    return (
      <EmptyWidget
        title="No investments linked"
        message="Add an investment or crypto account to see portfolio allocation."
        ctaLabel="Open Accounts"
        ctaTo="/accounts"
      />
    );
  }

  return (
    <Card className="transition">
      <h2 className="text-sm font-semibold text-foreground">Investments</h2>
      <p className="mt-1 text-xs text-muted">Portfolio from linked accounts</p>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{formatCurrency(investments.total, currency)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr] sm:items-center">
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={investments.allocation} dataKey="value" nameKey="name" innerRadius={32} outerRadius={48} paddingAngle={2}>
                {investments.allocation.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-xs">
          {investments.allocation.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                {item.name}
              </span>
              <span className="tabular-nums text-foreground">{formatCurrency(item.value, currency)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
