import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { Button } from '@/shared/components';
import { cn } from '@/core/utils/cn';

const PAGE_SIZE = 12;

type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export function WealthDataTable<T extends { id: string }>({
  title,
  subtitle,
  icon: Icon,
  rows,
  columns,
  totalLabel,
  totalValue,
  addLabel = 'Add',
  onAdd,
  defaultOpen = true
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  rows: T[];
  columns: Column<T>[];
  totalLabel?: string;
  totalValue?: string;
  addLabel?: string;
  onAdd?: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const value = (row as Record<string, unknown>)[String(col.key)];
        return value != null && String(value).toLowerCase().includes(q);
      })
    );
  }, [rows, columns, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(() => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [filtered, page]);

  return (
    <section className="card-shell overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-accent" /> : null}
          <div className="min-w-0">
            <h2 className="font-semibold text-[var(--color-card-foreground)]">{title}</h2>
            <p className="text-xs text-[var(--color-card-muted)]">
              {subtitle ?? `${rows.length} records`}
              {totalLabel && totalValue ? ` · ${totalLabel}: ${totalValue}` : ''}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              className="input h-8 w-40 pl-8 text-xs"
              placeholder="Search…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </label>
          {onAdd ? (
            <Button type="button" className="h-8 px-2.5 text-xs" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {open ? (
        !filtered.length ? (
          <div className="p-8 text-center text-sm text-[var(--color-card-muted)]">No records yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-muted/80 text-left text-[11px] uppercase tracking-wide text-[var(--color-card-muted)]">
                  <tr>
                    {columns.map((column) => (
                      <th key={String(column.key)} className="px-4 py-2 font-semibold">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      {columns.map((column) => (
                        <td key={String(column.key)} className="px-4 py-2 text-[var(--color-card-foreground)]">
                          {column.render
                            ? column.render(row)
                            : String((row as Record<string, unknown>)[String(column.key)] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted">
                <span>
                  Page {page + 1} of {pageCount}
                </span>
                <div className="flex gap-1">
                  <Button type="button" className="h-7 border border-border bg-transparent px-2 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <Button
                    type="button"
                    className="h-7 border border-border bg-transparent px-2 text-xs"
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )
      ) : null}
    </section>
  );
}

export function TypeGroupTable<T extends { id: string }>({
  title,
  groups,
  columns
}: {
  title: string;
  groups: Array<{ label: string; rows: T[] }>;
  columns: Column<T>[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {groups.map((group) => (
        <WealthDataTable
          key={group.label}
          title={group.label}
          subtitle={`${group.rows.length} items`}
          rows={group.rows}
          columns={columns}
          defaultOpen={group.rows.length > 0}
        />
      ))}
    </div>
  );
}

export function formatPct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function cnPositive(value: number) {
  return cn(value >= 0 ? 'text-[var(--color-accent-green)]' : 'text-red-300');
}
