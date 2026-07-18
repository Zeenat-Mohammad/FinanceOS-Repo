import { LayoutGrid, List } from 'lucide-react';
import { SearchInput } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { RecurringFilter, RecurringSort, RecurringStatusTab, RecurringView } from '../useRecurringWorkspace';

const STATUS_TABS: Array<{ id: RecurringStatusTab; label: string }> = [
  { id: 'current', label: 'Current' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' }
];

const FILTER_TABS: Array<{ id: RecurringFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'bill', label: 'Bills' },
  { id: 'subscription', label: 'Subscriptions' },
  { id: 'debt', label: 'Debt Payments' },
  { id: 'savings', label: 'Savings' },
  { id: 'expense', label: 'Expenses' }
];

export function RecurringFilters({
  search,
  onSearch,
  statusTab,
  onStatusTab,
  tabCounts,
  filter,
  onFilter,
  sort,
  onSort,
  view,
  onView
}: {
  search: string;
  onSearch: (v: string) => void;
  statusTab: RecurringStatusTab;
  onStatusTab: (v: RecurringStatusTab) => void;
  tabCounts: { current: number; paused: number; completed: number };
  filter: RecurringFilter;
  onFilter: (v: RecurringFilter) => void;
  sort: RecurringSort;
  onSort: (v: RecurringSort) => void;
  view: RecurringView;
  onView: (v: RecurringView) => void;
}) {
  return (
    <div className="card-shell space-y-3 p-4">
      <div className="flex flex-wrap gap-1.5 rounded-md bg-primary/70 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition sm:flex-none',
              statusTab === tab.id ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-foreground'
            )}
            onClick={() => onStatusTab(tab.id)}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                statusTab === tab.id ? 'bg-white/20 text-white' : 'bg-surface-muted text-muted'
              )}
            >
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <SearchInput
          placeholder="Search recurring payments…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search recurring payments"
        />
        <label className="flex items-center gap-2 text-xs text-muted">
          Sort
          <select className="select w-auto min-w-[150px]" value={sort} onChange={(e) => onSort(e.target.value as RecurringSort)}>
            <option value="next_due">Next Due</option>
            <option value="amount">Amount</option>
            <option value="name">Name</option>
          </select>
        </label>
        <div className="flex items-center gap-1 rounded-md border border-border bg-primary/40 p-1">
          <button
            type="button"
            aria-label="Grid view"
            className={cn('rounded p-1.5', view === 'grid' ? 'bg-accent text-white' : 'text-muted hover:text-foreground')}
            onClick={() => onView('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="List view"
            className={cn('rounded p-1.5', view === 'list' ? 'bg-accent text-white' : 'text-muted hover:text-foreground')}
            onClick={() => onView('list')}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-medium transition',
              filter === tab.id
                ? 'bg-accent text-white shadow-sm'
                : 'bg-[var(--color-sidebar)] text-white hover:bg-secondary'
            )}
            onClick={() => onFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
