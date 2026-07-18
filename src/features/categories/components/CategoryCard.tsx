import { memo, useState } from 'react';
import { Archive, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/core/utils/currency';
import { Button, Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { EnrichedCategory } from '../categoryEnrichment';
import { getCategoryIcon, typeAccent } from '../categoryIcons';
import { CategoryTrendChart } from './CategoryTrendChart';

export const CategoryCard = memo(function CategoryCard({
  category,
  currency,
  size,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  onViewTransactions
}: {
  category: EnrichedCategory;
  currency: string;
  size: 'small' | 'medium' | 'large';
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onViewTransactions: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = getCategoryIcon(category.name, category.icon);
  const accent = typeAccent(category.archived ? 'archived' : category.type);
  const isIncome = category.type === 'income';
  const amountLabel = isIncome ? 'Total received' : 'Total spent';

  return (
    <Card
      className={cn(
        'group relative flex flex-col overflow-hidden transition transition duration-300 hover:-translate-y-0.5 hover:shadow-card',
        accent.border,
        size === 'small' && 'p-3',
        size === 'large' && 'p-5'
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/15 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-2">
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={onOpen}>
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-brand"
            style={{ background: category.color ? `${category.color}33` : 'var(--color-primary)', color: category.color || 'var(--color-accent-teal)' }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{category.name}</h3>
            <span className={cn('mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', accent.chip)}>
              {category.type}
            </span>
          </div>
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Category menu"
            className="rounded-md p-1.5 text-muted hover:bg-primary hover:text-foreground"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-brand border border-border bg-surface p-1 shadow-card">
              <MenuItem label="Edit" onClick={() => { setMenuOpen(false); onEdit(); }} />
              <MenuItem label="Archive" onClick={() => { setMenuOpen(false); onArchive(); }} />
              <MenuItem label="Delete" danger onClick={() => { setMenuOpen(false); onDelete(); }} />
            </div>
          ) : null}
        </div>
      </div>

      <button type="button" className="relative mt-4 grid gap-2 text-left text-xs text-muted" onClick={onOpen}>
        {category.budgetApplicable && category.budget > 0 ? (
          <div>Budget assigned · {formatCurrency(category.budget, currency)}</div>
        ) : (
          <div>No budget assigned</div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>{category.usage.transactionCount} transactions</span>
          <span>
            Last used{' '}
            {category.usage.lastUsed ? format(parseISO(category.usage.lastUsed), 'MMM d, yyyy') : '—'}
          </span>
        </div>
      </button>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
        <Metric label={amountLabel} value={formatCurrency(category.usage.totalAmount, currency)} />
        <Metric label="Monthly avg" value={formatCurrency(category.usage.monthlyAverage, currency)} />
        {category.budget > 0 ? (
          <>
            <Metric label="Budget" value={formatCurrency(category.budget, currency)} />
            <Metric
              label="Remaining"
              value={formatCurrency(Math.abs(category.budgetRemaining), currency)}
              tone={category.budgetRemaining < 0 ? 'danger' : 'success'}
            />
          </>
        ) : null}
      </div>

      {category.budget > 0 ? (
        <div className="relative mt-4">
          <div className="mb-1 flex justify-between text-[11px] text-muted">
            <span>Budget usage</span>
            <span className="tabular-nums">{Math.min(999, category.budgetProgress).toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                category.budgetStatus === 'over' && 'bg-destructive',
                category.budgetStatus === 'watch' && 'bg-[#E8A87C]',
                category.budgetStatus === 'healthy' && 'bg-success'
              )}
              style={{ width: `${Math.min(100, category.budgetProgress)}%` }}
            />
          </div>
        </div>
      ) : null}

      {size !== 'small' ? (
        <div className="relative mt-4">
          <CategoryTrendChart values={category.usage.monthlyTrend} labels={category.usage.monthLabels} currency={currency} />
        </div>
      ) : null}

      <div className="relative mt-4 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
        <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={onEdit}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={onArchive}>
          <Archive className="h-3 w-3" /> Archive
        </Button>
        <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={onViewTransactions}>
          <Eye className="h-3 w-3" /> Transactions
        </Button>
        <Button className="h-8 bg-destructive px-2 text-xs text-destructive-foreground hover:bg-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" /> Delete
        </Button>
      </div>
    </Card>
  );
});

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="rounded-md border border-border/50 bg-primary/30 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-sm font-medium tabular-nums text-foreground',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-destructive'
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn('w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-primary', danger && 'text-destructive')}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
