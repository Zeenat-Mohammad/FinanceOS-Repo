import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/core/utils/cn';

export function Sparkline({
  values,
  tone = 'green'
}: {
  values: number[];
  tone?: 'green' | 'purple' | 'teal' | 'red';
}) {
  const data = (values.length ? values : [0, 0]).map((v, i) => ({ i, v }));
  const stroke =
    tone === 'purple'
      ? 'var(--color-accent-purple)'
      : tone === 'teal'
        ? 'var(--color-accent-teal)'
        : tone === 'red'
          ? 'var(--color-destructive)'
          : 'var(--color-accent-green)';
  const fillId = `spark-${tone}`;

  return (
    <div className={cn('h-12 w-full')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2.25} fill={`url(#${fillId})`} dot={false} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
