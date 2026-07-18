import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/core/utils/currency';
import { Card, SearchInput } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { WorkspaceTransaction } from '@/features/transactions-workspace/monthlyFinance';
import { EmptyWidget } from './EmptyWidget';
import { DebtDrawer } from '@/features/debt/components/DebtDrawer';

export function RecentTransactions({
  transactions,
  currency
}: {
  transactions: WorkspaceTransaction[];
  currency: string;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WorkspaceTransaction | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions.slice(0, 8);
    return transactions
      .filter(
        (t) =>
          t.merchantLabel.toLowerCase().includes(q) ||
          t.categoryName.toLowerCase().includes(q) ||
          t.accountName.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [transactions, query]);

  if (transactions.length === 0) {
    return (
      <EmptyWidget
        title="No recent transactions"
        message="Add your first transaction to populate the dashboard ledger."
        ctaLabel="Add transaction"
        ctaTo="/transactions"
      />
    );
  }

  return (
    <>
      <Card className="transition">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Transactions</h2>
          <div className="flex items-center gap-2">
            <div className="w-44">
              <SearchInput placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter recent transactions" />
            </div>
            <Link to="/transactions" className="text-xs font-medium text-accent hover:underline">
              View all →
            </Link>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-2 py-2 font-medium">Merchant</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Account</th>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  className="cursor-pointer border-b border-border/40 hover:bg-primary/35"
                  onClick={() => setSelected(tx)}
                >
                  <td className="px-2 py-2.5 font-medium text-foreground">{tx.merchantLabel}</td>
                  <td className="px-2 py-2.5 text-muted">{tx.categoryName}</td>
                  <td className="px-2 py-2.5 text-muted">{tx.accountName}</td>
                  <td className="px-2 py-2.5 text-muted">{tx.date}</td>
                  <td
                    className={cn(
                      'px-2 py-2.5 text-right tabular-nums font-medium',
                      tx.signedAmount >= 0 ? 'text-success' : 'text-foreground'
                    )}
                  >
                    {formatCurrency(Math.abs(tx.signedAmount || tx.amount), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DebtDrawer open={Boolean(selected)} title="Transaction" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-3 text-sm">
            <Row label="Merchant" value={selected.merchantLabel} />
            <Row label="Category" value={selected.categoryName} />
            <Row label="Account" value={selected.accountName} />
            <Row label="Date" value={selected.date} />
            <Row label="Status" value={selected.status} />
            <Row label="Amount" value={formatCurrency(selected.amount, currency)} />
            {selected.notes ? <Row label="Notes" value={selected.notes} /> : null}
            <Link to="/transactions" className="inline-flex text-xs font-medium text-accent hover:underline">
              Open in Transactions →
            </Link>
          </div>
        ) : null}
      </DebtDrawer>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}
