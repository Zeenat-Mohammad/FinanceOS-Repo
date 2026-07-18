import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, CircleDollarSign } from 'lucide-react';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import { getCategoryIcon } from '@/features/categories/categoryIcons';

export type CategoryChartDatum = {
  id?: string;
  name: string;
  value: number;
  color?: string | null;
  icon?: string | null;
};

const palette = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent-green)',
  'var(--color-accent-purple)',
  'var(--color-accent-teal)'
];

export function ResponsiveCategoryChart({
  data,
  currency,
  locale = 'en-US',
  title = 'Spending by Category',
  subtitle,
  className,
  onCategoryClick
}: {
  data: CategoryChartDatum[];
  currency: string;
  locale?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  onCategoryClick?: (category: CategoryChartDatum) => void;
}) {
  const chartData = data.filter((item) => item.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const empty = chartData.length === 0;
  const safeData = empty ? [{ name: 'No spending', value: 1, color: 'var(--color-border)' }] : chartData;

  return (
    <div className={cn('flex h-full min-h-[18rem] flex-col', className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[11px] text-muted">{subtitle ?? `${formatCurrency(total, currency, locale)} total this month`}</p>
      </div>

      {empty ? (
        <div className="grid flex-1 place-items-center rounded-brand border border-dashed border-border bg-surface-muted/30 p-6 text-center">
          <div>
            <CircleDollarSign className="mx-auto h-8 w-8 text-muted" aria-hidden />
            <p className="mt-3 text-sm font-medium text-foreground">No spending data available for this period.</p>
          </div>
        </div>
      ) : (
        <div className="grid flex-1 items-center gap-4 min-[520px]:grid-cols-[minmax(12rem,0.9fr)_minmax(13rem,1.1fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(12rem,0.9fr)_minmax(13rem,1.1fr)]">
          <div className="h-[clamp(13rem,34vw,18rem)] min-h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="54%"
                  outerRadius="82%"
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={850}
                  onClick={(entry) => {
                    const datum = entry as CategoryChartDatum;
                    if (datum?.id || datum?.name) onCategoryClick?.(datum);
                  }}
                >
                  {safeData.map((item, index) => (
                    <Cell
                      key={item.name}
                      className={onCategoryClick ? 'cursor-pointer outline-none transition-opacity hover:opacity-80' : undefined}
                      fill={item.color || palette[index % palette.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => {
                    const amount = Number(value);
                    const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                    return [`${formatCurrency(amount, currency, locale)} · ${pct}%`, props.payload?.name ?? 'Category'];
                  }}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    color: 'var(--color-foreground)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
            {chartData.map((item, index) => {
              const Icon = getCategoryIcon(item.name, item.icon);
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              const color = item.color || palette[index % palette.length];
              return (
                <li key={item.id ?? item.name}>
                  <button
                    type="button"
                    className={cn(
                      'group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition',
                      onCategoryClick ? 'hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent/40' : 'cursor-default'
                    )}
                    onClick={() => onCategoryClick?.(item)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border/70" style={{ color }}>
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{item.name}</span>
                        <span className="text-[10px] text-muted">{pct}% of spending</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.value, currency, locale)}
                      {onCategoryClick ? <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" aria-hidden /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
