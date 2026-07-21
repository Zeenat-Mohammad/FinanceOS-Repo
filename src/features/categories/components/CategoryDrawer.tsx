import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/core/utils/currency';
import { Button } from '@/shared/components';
import { DebtDrawer } from '@/features/debt/components/DebtDrawer';
import type { EnrichedCategory } from '../categoryEnrichment';
import type { Transaction } from '@/types/finance';
import { getCategoryIcon, typeAccent } from '../categoryIcons';
import { CategoryTrendChart } from './CategoryTrendChart';
import { cn } from '@/core/utils/cn';

export function CategoryDrawer({
  open,
  category,
  subcategories,
  recentTransactions,
  currency,
  onClose,
  onEdit,
  onArchive,
  onDelete
}: {
  open: boolean;
  category: EnrichedCategory | null;
  subcategories?: EnrichedCategory[];
  recentTransactions: Transaction[];
  currency: string;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  if (!category) return <DebtDrawer open={false} title="" onClose={onClose}>{null}</DebtDrawer>;

  const Icon = getCategoryIcon(category.name, category.icon);
  const accent = typeAccent(category.type);
  const related = recentTransactions.filter((t) => t.category_id === category.id).slice(0, 8);

  return (
    <DebtDrawer open={open} title={category.name} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-brand"
            style={{ background: category.color ? `${category.color}33` : 'var(--color-primary)', color: category.color || 'var(--color-accent-teal)' }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase', accent.chip)}>{category.type}</span>
            <p className="mt-1 text-xs text-muted">{category.description || 'No description'}</p>
          </div>
        </div>

        <DetailGrid
          rows={[
            ['Parent', category.parentName ?? 'None'],
            ['Subcategories', String(category.childCount)],
            ['Transactions', String(category.usage.transactionCount)],
            ['Last used', category.usage.lastUsed ? format(parseISO(category.usage.lastUsed), 'MMM d, yyyy') : '—'],
            [category.type === 'income' ? 'Total received' : 'Total spent', formatCurrency(category.usage.totalAmount, currency)],
            ['Monthly average', formatCurrency(category.usage.monthlyAverage, currency)],
            ['Budget', category.budget > 0 ? formatCurrency(category.budget, currency) : 'Not set'],
            ['Remaining', category.budget > 0 ? formatCurrency(category.budgetRemaining, currency) : '—']
          ]}
        />

        {subcategories && subcategories.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Subcategories</h3>
            <ul className="mt-2 space-y-1">
              {subcategories.map((child) => (
                <li key={child.id} className="rounded-md border border-border/50 bg-primary/30 px-2 py-1.5 text-sm text-foreground">
                  {child.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Monthly trend</h3>
          <CategoryTrendChart values={category.usage.monthlyTrend} labels={category.usage.monthLabels} currency={currency} />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Recent transactions</h3>
          {related.length === 0 ? (
            <p className="mt-2 text-xs text-muted">No recent activity in this category.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {related.map((tx) => (
                <li key={tx.id} className="flex justify-between gap-2 rounded-md border border-border/40 bg-primary/25 px-2 py-1.5 text-xs">
                  <span className="truncate text-foreground">{tx.merchant || tx.description || 'Transaction'}</span>
                  <span className="tabular-nums text-muted">
                    {formatCurrency(tx.amount, currency)} · {tx.date}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="action-button" onClick={onEdit}>
            Edit
          </Button>
          <Button className="action-button" onClick={onArchive}>
            Archive
          </Button>
          <Button className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={onDelete}>
            Delete
          </Button>
          <Link to="/transactions" className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm text-white hover:bg-accent/90">
            View transactions
          </Link>
        </div>
      </div>
    </DebtDrawer>
  );
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-border/50 bg-primary/30 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-0.5 text-sm text-foreground">{value}</div>
        </div>
      ))}
    </div>
  );
}
