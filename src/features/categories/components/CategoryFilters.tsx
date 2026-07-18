import { SearchInput } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { CategorySort, CategoryTypeFilter, GridSize } from '../useCategoryWorkspace';

const TYPE_FILTERS: Array<{ id: CategoryTypeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'archived', label: 'Archived' }
];

export function CategoryFilters({
  search,
  onSearch,
  typeFilter,
  onTypeFilter,
  sort,
  onSort,
  gridSize,
  onGridSize
}: {
  search: string;
  onSearch: (v: string) => void;
  typeFilter: CategoryTypeFilter;
  onTypeFilter: (v: CategoryTypeFilter) => void;
  sort: CategorySort;
  onSort: (v: CategorySort) => void;
  gridSize: GridSize;
  onGridSize: (v: GridSize) => void;
}) {
  return (
    <div className="space-y-3 rounded-brand border border-border bg-surface/70 p-4 backdrop-blur-md">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <SearchInput placeholder="Search categories…" value={search} onChange={(e) => onSearch(e.target.value)} aria-label="Search categories" />
        <label className="flex items-center gap-2 text-xs text-muted">
          Sort
          <select className="select w-auto min-w-[160px]" value={sort} onChange={(e) => onSort(e.target.value as CategorySort)}>
            <option value="alpha">Alphabetical</option>
            <option value="recent">Recently Created</option>
            <option value="most_used">Most Used</option>
            <option value="highest">Highest Spending</option>
            <option value="lowest">Lowest Spending</option>
          </select>
        </label>
        <div className="flex items-center gap-1 rounded-md border border-border bg-primary/40 p-1">
          {(['small', 'medium', 'large'] as GridSize[]).map((size) => (
            <button
              key={size}
              type="button"
              className={cn('rounded px-2.5 py-1 text-[11px] capitalize', gridSize === size ? 'bg-accent text-white' : 'text-muted hover:text-foreground')}
              onClick={() => onGridSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition',
              typeFilter === filter.id ? 'bg-accent text-white' : 'bg-primary text-muted hover:text-foreground'
            )}
            onClick={() => onTypeFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
