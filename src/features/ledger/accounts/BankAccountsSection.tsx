import { useMemo, useState } from 'react';
import { Plus, Search, TrendingUp, Wallet } from 'lucide-react';
import type { Account } from '@/types/finance';
import { Button, Card } from '@/shared/components';
import { formatCurrency } from '@/core/utils/currency';

const PAGE_SIZE = 10;

export function BankAccountsSection({
  accounts,
  currency,
  onEdit,
  onArchive,
  onDelete,
  onAdd,
  onAddInvestment,
  archivedAccounts
}: {
  accounts: Account[];
  archivedAccounts: Account[];
  currency: string;
  onEdit: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onAddInvestment: () => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'active' | 'archived' | 'all'>('active');

  const visibleAccounts = useMemo(
    () => view === 'active' ? accounts : view === 'archived' ? archivedAccounts : [...accounts, ...archivedAccounts],
    [accounts, archivedAccounts, view]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleAccounts;
    return visibleAccounts.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.institution ?? '').toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q)
    );
  }, [visibleAccounts, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalBalance = accounts.reduce((sum, row) => sum + Number(row.balance ?? row.opening_balance ?? 0), 0);
  const archivedBalance = archivedAccounts.reduce((sum, row) => sum + Number(row.balance ?? row.opening_balance ?? 0), 0);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Wallet className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bank Accounts</h2>
            <p className="text-xs text-muted">
              {accounts.length} accounts · {formatCurrency(totalBalance, currency)} total cash
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              className="input h-8 w-44 pl-8 text-xs"
              placeholder="Search accounts…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </label>
          <Button type="button" className="h-8 px-2.5 text-xs" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Account
          </Button>
          <Button type="button" className="h-8 bg-accent px-2.5 text-xs hover:bg-secondary" onClick={onAddInvestment}>
            <TrendingUp className="h-3.5 w-3.5" />
            Add Investment
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex rounded-lg bg-surface-muted p-1" role="tablist" aria-label="Account status">
          {(['active', 'archived', 'all'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === item}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${view === item ? 'bg-[var(--color-button)] text-white shadow-sm' : 'text-muted hover:text-foreground'}`}
              onClick={() => { setView(item); setPage(0); }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-muted">
          <span><strong className="text-foreground">{archivedAccounts.length}</strong> archived</span>
          <span><strong className="text-foreground">{formatCurrency(archivedBalance, currency)}</strong> archived balance</span>
        </div>
      </div>

      {!filtered.length ? (
        <div className="p-8 text-center text-sm text-muted">No bank accounts yet. Add checking, savings, or wallet accounts here.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted/80 text-left text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2">Account Name</th>
                  <th className="px-4 py-2">Institution</th>
                  <th className="px-4 py-2">Current Balance</th>
                  <th className="px-4 py-2">Currency</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">{view === 'archived' ? 'Archive Date' : 'Last Updated'}</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((account) => (
                  <tr key={account.id} className="border-t border-border/60">
                    <td className="px-4 py-2 font-medium">{account.name}</td>
                    <td className="px-4 py-2 text-muted">{account.institution || '—'}</td>
                    <td className="px-4 py-2 tabular-nums">{formatCurrency(account.balance ?? account.opening_balance ?? 0, account.currency)}</td>
                    <td className="px-4 py-2">{account.currency}</td>
                    <td className="px-4 py-2 capitalize">{account.is_archived ? 'Archived' : 'Active'}</td>
                    <td className="px-4 py-2 text-muted">{new Date(account.is_archived && account.archived_at ? account.archived_at : account.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" className="action-button h-7 px-2 text-xs" onClick={() => onEdit(account.id, account.name)}>
                          Edit
                        </Button>
                        {account.is_archived ? (
                          <Button type="button" className="action-button h-7 px-2 text-xs" onClick={() => onArchive(account.id)}>Restore</Button>
                        ) : (
                          <Button type="button" className="action-button h-7 px-2 text-xs" onClick={() => onArchive(account.id)}>Archive</Button>
                        )}
                        <Button type="button" className="h-7 bg-destructive px-2 text-xs" onClick={() => onDelete(account.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
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
                <Button type="button" className="h-7 border border-border bg-transparent px-2 text-xs" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
