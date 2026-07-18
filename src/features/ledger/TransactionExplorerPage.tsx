import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Filter, Search, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccountsRepository, CategoriesRepository, ImportBatchesRepository, TransactionsRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { Button, Card, LoadingState, Page, PageHeader, SearchInput, Table } from '@/shared/components';
import { useLedgerContext } from './useLedgerContext';
import { parseLedgerCsv, toTransactionInput } from './ledgerCsv';

export default function TransactionExplorerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { household, user, loading } = useLedgerContext();
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    categoryId: '',
    page: 1,
    pageSize: 30,
    sortBy: 'date',
    sortDirection: 'desc'
  });
  const accountsQuery = useQuery({ queryKey: queryKeys.accounts.all, queryFn: AccountsRepository.list });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories.all, queryFn: CategoriesRepository.list });
  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions.ledger(filters),
    queryFn: () => TransactionsRepository.list({
      ...filters,
      categoryId: filters.categoryId || undefined
    } as never),
    enabled: Boolean(household)
  });
  const totalPages = useMemo(() => Math.max(1, Math.ceil((transactionsQuery.data?.count ?? 0) / filters.pageSize)), [filters.pageSize, transactionsQuery.data?.count]);

  if (loading || accountsQuery.isLoading || categoriesQuery.isLoading || transactionsQuery.isLoading) {
    return <LoadingState label="Loading transaction explorer" />;
  }

  async function importCsv(file: File | undefined) {
    if (!file || !household || !user) return;
    const accountId = accountsQuery.data?.[0]?.id;
    if (!accountId) return;
    const rows = parseLedgerCsv(await file.text());
    const validRows = rows.filter((row) => row.errors.length === 0 && !row.duplicate);
    const batch = await ImportBatchesRepository.create({
      household_id: household.id,
      file_name: file.name,
      summary: { totalRows: rows.length, validRows: validRows.length, duplicateRows: rows.filter((row) => row.duplicate).length }
    });

    try {
      await Promise.all(
        validRows.map((row) =>
          TransactionsRepository.create(
            toTransactionInput(row, {
              household_id: household.id,
              user_id: user.id,
              account_id: accountId,
              import_batch_id: batch.id
            })
          )
        )
      );
      await ImportBatchesRepository.complete(batch.id, { totalRows: rows.length, importedRows: validRows.length });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error) {
      await ImportBatchesRepository.rollback(batch.id);
      throw error;
    }
  }

  function exportCsv() {
    const rows = transactionsQuery.data?.data ?? [];
    const csv = [
      ['Date', 'Type', 'Amount', 'Merchant', 'Description', 'Status', 'Tags'].join(','),
      ...rows.map((transaction) => [
        transaction.date,
        transaction.type,
        transaction.amount,
        csvCell(transaction.merchant ?? ''),
        csvCell(transaction.description ?? ''),
        transaction.status,
        csvCell(transaction.tags?.join('|') ?? '')
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finlo-transactions-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page>
      <PageHeader
        title="Transaction Explorer"
        description="Advanced search, filters, bulk actions, CSV tools, and full-ledger review."
        action={
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => navigate('/transactions')}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back to Workspace
          </Button>
        }
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-primary px-3 py-1 text-xs text-muted"><Filter aria-hidden className="h-3.5 w-3.5" />Saved Filters</span>
          {['Account', 'Category', 'Date', 'Merchant', 'Amount', 'Tags', 'Recurring', 'Receipt', 'Status'].map((chip) => (
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-muted" key={chip}>{chip}</span>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          <SearchInput placeholder="Search merchant, category, notes, tags, account" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} />
          <select className="select" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value, page: 1 }))}>
            {['all', 'income', 'expense', 'transfer', 'refund', 'adjustment', 'opening_balance'].map((type) => <option key={type}>{type}</option>)}
          </select>
          <select className="select" value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value, page: 1 }))}>
            <option value="">All categories</option>
            {(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select className="select" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
            {['all', 'expected', 'pending', 'posted', 'reconciled', 'void'].map((status) => <option key={status}>{status}</option>)}
          </select>
          <select className="select" value={filters.sortDirection} onChange={(event) => setFilters((current) => ({ ...current, sortDirection: event.target.value }))}>
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive" disabled={selected.length === 0} onClick={() => TransactionsRepository.bulkDelete(selected).then(() => queryClient.invalidateQueries({ queryKey: ['transactions'] }))}>
              <Trash2 aria-hidden className="h-4 w-4" />
              Bulk Delete
            </Button>
            <select className="select max-w-xs" onChange={(event) => event.target.value && TransactionsRepository.bulkCategorize(selected, event.target.value).then(() => queryClient.invalidateQueries({ queryKey: ['transactions'] }))}>
              <option value="">Bulk categorize</option>
              {(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={exportCsv}><Download aria-hidden className="h-4 w-4" />Export CSV</Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-muted px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary">
              <Upload aria-hidden className="h-4 w-4" />
              Import CSV
              <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(event.target.files?.[0])} />
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted">
          <Search aria-hidden className="h-4 w-4" />
          Showing {transactionsQuery.data?.data.length ?? 0} of {transactionsQuery.data?.count ?? 0} transactions. Long-ledger virtualization is the next performance extension point.
        </div>
        <Table>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(transactionsQuery.data?.data ?? []).map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.includes(transaction.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, transaction.id] : current.filter((id) => id !== transaction.id))} />
                </td>
                <td className="px-3 py-2">{transaction.date}</td>
                <td className="px-3 py-2">{transaction.type}</td>
                <td className="px-3 py-2">{transaction.merchant || transaction.description || 'Ledger entry'}</td>
                <td className="px-3 py-2">{transaction.amount}</td>
                <td className="px-3 py-2">{transaction.status}</td>
                <td className="px-3 py-2">{transaction.tags?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>Page {filters.page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</Button>
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" disabled={filters.page >= totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</Button>
        </div>
      </div>
    </Page>
  );
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
