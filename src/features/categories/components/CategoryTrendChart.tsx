import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/core/utils/currency';

export function CategoryTrendChart({
  values,
  labels,
  currency
}: {
  values: number[];
  labels: string[];
  currency: string;
}) {
  const data = values.map((v, i) => ({ label: labels[i] ?? `M${i + 1}`, value: v }));

  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">Last 6 months</div>
      <div className="h-14">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Tooltip
              formatter={(v) => formatCurrency(Number(v), currency)}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 11
              }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--color-accent-teal)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
