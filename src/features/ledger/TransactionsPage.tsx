import { lazy, Suspense, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Archive,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  Repeat,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  X
} from 'lucide-react';
import { AccountsRepository, CategoriesRepository, ImportBatchesRepository, TransactionsRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { Button, Card, EmptyState, LoadingState, Modal, Page, Table } from '@/shared/components';
import type { Transaction } from '@/types/finance';
import { useAuthStore } from '@/features/auth/authStore';
import { useLedgerContext } from './useLedgerContext';
import { parseLedgerCsv, toTransactionInput } from './ledgerCsv';
import {
  buildMonthlyWorkspaceModel,
  formatCurrency,
  formatPercent,
  getMonthWindow,
  monthKey,
  type KPI,
  type MonthWindow,
  type WorkspaceTransaction
} from '@/features/transactions-workspace/monthlyFinance';

const MonthlyCharts = lazy(() => import('@/features/transactions-workspace/MonthlyCharts'));

const transactionSchema = z.object({
  kind: z.enum(['expense', 'income', 'transfer', 'bill', 'subscription', 'savings', 'debt']),
  account_id: z.string().min(1, 'Choose an account.'),
  to_account_id: z.string().optional(),
  category_id: z.string().optional(),
  amount: z.coerce.number().positive('Enter an amount greater than zero.'),
  date: z.string().min(1, 'Choose a date.'),
  merchant: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  attachment_url: z.string().optional()
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const quickAddOptions: Array<{ kind: TransactionFormValues['kind']; label: string; icon: typeof Receipt }> = [
  { kind: 'expense', label: 'Expense', icon: Receipt },
  { kind: 'income', label: 'Income', icon: Banknote },
  { kind: 'transfer', label: 'Transfer', icon: Repeat },
  { kind: 'bill', label: 'Bill', icon: CalendarDays },
  { kind: 'subscription', label: 'Subscription', icon: Repeat },
  { kind: 'savings', label: 'Savings', icon: PiggyBank },
  { kind: 'debt', label: 'Debt Payment', icon: Landmark }
];

export default function TransactionsPage() {
  const { user, household, loading } = useLedgerContext();
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [archivedMonths, setArchivedMonths] = useState(() => new Set<string>());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [drawerTransaction, setDrawerTransaction] = useState<WorkspaceTransaction | null>(null);
  const month = useMemo(() => getMonthWindow(anchorDate, archivedMonths), [anchorDate, archivedMonths]);
  const currency = profile?.currency || household?.default_currency || 'USD';
  const locale = profile?.locale || household?.locale || 'en-US';

  const accountsQuery = useQuery({ queryKey: queryKeys.accounts.all, queryFn: AccountsRepository.list });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories.all, queryFn: CategoriesRepository.list });
  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions.byPeriod(month.start, month.end),
    queryFn: () => TransactionsRepository.listByPeriod(month.start, month.end),
    enabled: Boolean(household)
  });
  const previousTransactionsQuery = useQuery({
    queryKey: queryKeys.transactions.byPeriod(month.previousStart, month.previousEnd),
    queryFn: () => TransactionsRepository.listByPeriod(month.previousStart, month.previousEnd),
    enabled: Boolean(household)
  });

  const workspace = useMemo(
    () =>
      buildMonthlyWorkspaceModel({
        transactions: transactionsQuery.data ?? [],
        previousTransactions: previousTransactionsQuery.data ?? [],
        accounts: accountsQuery.data ?? [],
        categories: categoriesQuery.data ?? [],
        month
      }),
    [accountsQuery.data, categoriesQuery.data, month, previousTransactionsQuery.data, transactionsQuery.data]
  );

  const createMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      if (!household || !user) throw new Error('Missing ledger context');

      if (values.kind === 'transfer') {
        if (!values.to_account_id) throw new Error('Choose a destination account.');
        return TransactionsRepository.createTransfer({
          household_id: household.id,
          user_id: user.id,
          from_account_id: values.account_id,
          to_account_id: values.to_account_id,
          amount: values.amount,
          date: values.date,
          description: values.description || values.merchant || null,
          notes: values.notes || null,
          tags: parseTags(values.tags)
        });
      }

      return TransactionsRepository.create({
        household_id: household.id,
        user_id: user.id,
        account_id: values.account_id,
        category_id: values.category_id || null,
        amount: values.amount,
        type: mapQuickAddKind(values.kind),
        date: values.date,
        merchant: values.merchant || null,
        description: values.description || values.merchant || null,
        notes: values.notes || null,
        tags: parseTags(values.tags),
        attachment_url: values.attachment_url || null,
        metadata: { quickAddKind: values.kind }
      });
    },
    onSuccess: async () => {
      setQuickAddOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  if (loading || accountsQuery.isLoading || categoriesQuery.isLoading || transactionsQuery.isLoading || previousTransactionsQuery.isLoading) {
    return <LoadingState label="Loading monthly workspace" />;
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
    const csv = [
      ['Date', 'Merchant', 'Description', 'Type', 'Amount', 'Account', 'Category', 'Status', 'Tags'].join(','),
      ...workspace.recent.concat(workspace.current.slice(10).map((transaction) => decorateFallback(transaction))).map((transaction) =>
        [
          transaction.date,
          csvCell(transaction.merchantLabel),
          csvCell(transaction.description ?? ''),
          transaction.type,
          transaction.amount,
          csvCell(transaction.accountName),
          csvCell(transaction.categoryName),
          transaction.status,
          csvCell(transaction.tags?.join('|') ?? '')
        ].join(',')
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finlo-${monthKey(month.anchor)}-transactions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function archiveMonth() {
    setArchivedMonths((current) => new Set([...current, monthKey(month.anchor)]));
    setArchiveOpen(false);
  }

  function decorateFallback(transaction: Transaction): WorkspaceTransaction {
    const account = accountsQuery.data?.find((item) => item.id === transaction.account_id);
    const category = categoriesQuery.data?.find((item) => item.id === transaction.category_id);
    return {
      ...transaction,
      merchantLabel: transaction.merchant || transaction.description || 'Ledger entry',
      accountName: account?.name ?? 'Unknown account',
      categoryName: category?.name ?? transaction.type,
      signedAmount: transaction.type === 'expense' ? -transaction.amount : transaction.amount
    };
  }

  return (
    <Page className="relative">
      <WorkspaceHeader
        month={month}
        onArchive={() => setArchiveOpen(true)}
        onExport={exportCsv}
        onImport={importCsv}
        onQuickAdd={() => setQuickAddOpen(true)}
        onMonthChange={setAnchorDate}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Monthly KPIs">
        {workspace.kpis.map((kpi) => <KPICard key={kpi.id} kpi={kpi} currency={currency} locale={locale} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr]" aria-label="Insights and charts">
        <InsightPanel insights={workspace.insights} />
        <Suspense fallback={<Card className="min-h-72 animate-pulse" />}>
          <MonthlyCharts model={workspace} currency={currency} locale={locale} />
        </Suspense>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <BudgetSummary rows={workspace.budgetRows} currency={currency} locale={locale} />
        <BillsCard bills={workspace.bills} currency={currency} locale={locale} />
        <SavingsCard savings={workspace.savings} currency={currency} locale={locale} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <IncomePanel incomeCards={workspace.incomeCards} currency={currency} locale={locale} />
        <SubscriptionsPanel subscriptions={workspace.subscriptions} currency={currency} locale={locale} />
        <ActionCenter onQuickAdd={() => setQuickAddOpen(true)} onExport={exportCsv} onArchive={() => setArchiveOpen(true)} />
      </section>

      <RecentTransactions transactions={workspace.recent} currency={currency} locale={locale} onOpen={setDrawerTransaction} />

      <button
        aria-label="Quick add transaction"
        className="fixed bottom-6 right-6 z-20 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-card transition hover:-translate-y-0.5 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-success"
        onClick={() => setQuickAddOpen(true)}
        type="button"
      >
        <Plus aria-hidden className="h-6 w-6" />
      </button>

      <QuickAddModal
        accounts={accountsQuery.data ?? []}
        categories={categoriesQuery.data ?? []}
        defaultDate={month.status === 'future' ? month.start : new Date().toISOString().slice(0, 10)}
        loading={createMutation.isPending}
        onClose={() => setQuickAddOpen(false)}
        onSubmit={(values) => createMutation.mutate(values)}
        open={quickAddOpen}
      />

      <ArchiveModal month={month} open={archiveOpen} onClose={() => setArchiveOpen(false)} onArchive={archiveMonth} />
      <TransactionDrawer transaction={drawerTransaction} currency={currency} locale={locale} onClose={() => setDrawerTransaction(null)} />
    </Page>
  );
}

function WorkspaceHeader({
  month,
  onMonthChange,
  onArchive,
  onExport,
  onImport,
  onQuickAdd
}: {
  month: MonthWindow;
  onMonthChange: (date: Date) => void;
  onArchive: () => void;
  onExport: () => void;
  onImport: (file: File | undefined) => void;
  onQuickAdd: () => void;
}) {
  const monthNames = Array.from({ length: 12 }, (_, index) => new Date(2026, index, 1).toLocaleString('default', { month: 'long' }));
  const years = Array.from({ length: 9 }, (_, index) => new Date().getFullYear() - 4 + index);

  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Monthly Workspace</h1>
          <MonthStatusBadge status={month.status} />
        </div>
        <p className="mt-2 text-sm text-muted">Manage your monthly finances from one ledger-powered operating center.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-brand border border-border bg-surface">
          <button aria-label="Previous month" className="p-2 text-muted hover:bg-secondary hover:text-white" onClick={() => onMonthChange(new Date(month.year, month.month - 1, 1))}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
          </button>
          <select className="border-x border-border bg-transparent px-3 py-2 text-sm outline-none" value={month.month} onChange={(event) => onMonthChange(new Date(month.year, Number(event.target.value), 1))}>
            {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select className="border-r border-border bg-transparent px-3 py-2 text-sm outline-none" value={month.year} onChange={(event) => onMonthChange(new Date(Number(event.target.value), month.month, 1))}>
            {years.map((year) => <option key={year}>{year}</option>)}
          </select>
          <button aria-label="Next month" className="p-2 text-muted hover:bg-secondary hover:text-white" onClick={() => onMonthChange(new Date(month.year, month.month + 1, 1))}>
            <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <Button className="border border-border bg-surface-muted text-foreground hover:bg-secondary" onClick={() => onMonthChange(new Date())}>
          <CalendarDays aria-hidden className="h-4 w-4" />
          Current Month
        </Button>
        <Button className="border border-border bg-surface-muted text-foreground hover:bg-secondary" onClick={onArchive}>
          <Archive aria-hidden className="h-4 w-4" />
          Archive
        </Button>
        <Button className="border border-border bg-surface-muted text-foreground hover:bg-secondary" onClick={onExport}>
          <Download aria-hidden className="h-4 w-4" />
          Export
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-muted px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary">
          <Upload aria-hidden className="h-4 w-4" />
          Import CSV
          <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void onImport(event.target.files?.[0])} />
        </label>
        <Button className="bg-accent text-white hover:bg-secondary" onClick={onQuickAdd}>
          <Plus aria-hidden className="h-4 w-4" />
          Quick Add
          <ChevronDown aria-hidden className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

function MonthStatusBadge({ status }: { status: MonthWindow['status'] }) {
  const className = status === 'current' ? 'bg-success text-primary' : status === 'future' ? 'bg-purple text-primary' : 'bg-surface-muted text-muted';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}>{status}</span>;
}

function KPICard({ kpi, currency, locale }: { kpi: KPI; currency: string; locale: string }) {
  const positive = kpi.trend >= 0;
  const Icon = kpi.tone === 'income' ? ArrowUpRight : kpi.tone === 'expense' ? ArrowDownRight : kpi.tone === 'savings' ? PiggyBank : kpi.tone === 'budget' ? Filter : TrendingUp;
  const max = Math.max(1, ...kpi.sparkline.map(Math.abs));

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:border-accent">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-success">
          <Icon aria-hidden className="h-5 w-5" />
        </div>
        <div className={`flex items-center gap-1 text-xs ${positive ? 'text-success' : 'text-destructive'}`} title={`Compared with previous month: ${kpi.previousValue}`}>
          {positive ? <TrendingUp aria-hidden className="h-3.5 w-3.5" /> : <TrendingDown aria-hidden className="h-3.5 w-3.5" />}
          {formatPercent(Math.abs(kpi.trend))}
        </div>
      </div>
      <div className="mt-4 text-sm text-muted">{kpi.label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{formatKpiValue(kpi, currency, locale)}</div>
      <div className="mt-4 flex h-10 items-end gap-1" aria-hidden>
        {kpi.sparkline.slice(-18).map((value, index) => (
          <span className="flex-1 rounded-t bg-accent/70 transition group-hover:bg-success" key={`${kpi.id}-${index}`} style={{ height: `${Math.max(12, (Math.abs(value) / max) * 100)}%` }} />
        ))}
      </div>
    </Card>
  );
}

function InsightPanel({ insights }: { insights: ReturnType<typeof buildMonthlyWorkspaceModel>['insights'] }) {
  return (
    <Card className="xl:min-h-[33rem]">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles aria-hidden className="h-5 w-5 text-success" />
        <div>
          <h2 className="font-semibold text-foreground">Quick Insights</h2>
          <p className="text-xs text-muted">Deterministic signals from this month’s ledger.</p>
        </div>
      </div>
      <div className="space-y-3">
        {insights.map((insight) => (
          <div className="rounded-brand border border-border bg-primary/40 p-3" key={insight.id}>
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${insight.tone === 'good' ? 'bg-success' : insight.tone === 'warning' ? 'bg-destructive' : 'bg-accent'}`} />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
                <p className="mt-1 text-xs text-muted">{insight.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BudgetSummary({ rows, currency, locale }: { rows: ReturnType<typeof buildMonthlyWorkspaceModel>['budgetRows']; currency: string; locale: string }) {
  return (
    <Card className="xl:col-span-6">
      <SectionTitle title="Budget Summary" subtitle="Budget baselines are inferred from previous-month ledger activity." />
      <Table>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Budget</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Remaining</th>
            <th className="px-3 py-2">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className={row.id === 'Totals' ? 'font-semibold text-foreground' : 'text-sm'}>
              <td className="px-3 py-2">{row.label}</td>
              <td className="px-3 py-2">{formatCurrency(row.budget, currency, locale)}</td>
              <td className="px-3 py-2">{formatCurrency(row.actual, currency, locale)}</td>
              <td className={`px-3 py-2 ${row.remaining < 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(row.remaining, currency, locale)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-primary">
                    <div className={`h-full rounded-full ${row.status === 'over' ? 'bg-destructive' : row.status === 'watch' ? 'bg-purple' : 'bg-success'}`} style={{ width: `${Math.min(100, row.progress)}%` }} />
                  </div>
                  <span className="text-xs text-muted">{formatPercent(row.progress)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function BillsCard({ bills, currency, locale }: { bills: ReturnType<typeof buildMonthlyWorkspaceModel>['bills']; currency: string; locale: string }) {
  return (
    <Card className="xl:col-span-3">
      <SectionTitle title="Bills" subtitle="Sorted by due date." />
      {bills.length === 0 ? <MiniEmpty title="No bills detected" /> : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <div className="rounded-brand border border-border bg-primary/40 p-3" key={bill.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{bill.merchant}</p>
                  <p className="text-xs text-muted">Due {bill.dueDate} • {bill.priority}</p>
                </div>
                <span className={bill.overdue ? 'text-xs text-destructive' : 'text-xs text-success'}>{bill.remaining > 0 ? 'Due' : 'Paid'}</span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{formatCurrency(bill.paid, currency, locale)} paid</span>
                <span>{formatCurrency(bill.remaining, currency, locale)} left</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SavingsCard({ savings, currency, locale }: { savings: ReturnType<typeof buildMonthlyWorkspaceModel>['savings']; currency: string; locale: string }) {
  return (
    <Card className="xl:col-span-3">
      <SectionTitle title="Savings" subtitle="Goal cards derived from savings-like ledger activity." />
      <div className="space-y-4">
        {savings.map((goal) => (
          <div key={goal.id}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{goal.goal}</span>
              <span className="text-muted">{formatPercent(goal.progress)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary">
              <div className="h-full rounded-full bg-success" style={{ width: `${goal.progress}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{formatCurrency(goal.current, currency, locale)}</span>
              <span>Forecast {formatCurrency(goal.forecast, currency, locale)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IncomePanel({ incomeCards, currency, locale }: { incomeCards: ReturnType<typeof buildMonthlyWorkspaceModel>['incomeCards']; currency: string; locale: string }) {
  return (
    <Card>
      <SectionTitle title="Income" subtitle="Expected vs received." />
      <div className="space-y-3">
        {incomeCards.map((card) => (
          <div className="rounded-brand bg-primary/40 p-3" key={card.id}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{card.source}</span>
              <span className={card.difference >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(card.difference, currency, locale)}</span>
            </div>
            <div className="mt-1 text-xs text-muted">Received {formatCurrency(card.received, currency, locale)} • {card.depositAccount}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SubscriptionsPanel({ subscriptions, currency, locale }: { subscriptions: ReturnType<typeof buildMonthlyWorkspaceModel>['subscriptions']; currency: string; locale: string }) {
  return (
    <Card>
      <SectionTitle title="Subscriptions" subtitle="Recurring-style merchants." />
      {subscriptions.length === 0 ? <MiniEmpty title="No subscriptions found" /> : (
        <div className="space-y-3">
          {subscriptions.map((subscription) => (
            <div className="flex items-center justify-between rounded-brand bg-primary/40 p-3" key={subscription.id}>
              <div>
                <p className="text-sm font-medium">{subscription.merchant}</p>
                <p className="text-xs text-muted">{subscription.category} • {subscription.renewalDate}</p>
              </div>
              <span className="text-sm font-semibold">{formatCurrency(subscription.monthlyCost, currency, locale)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ActionCenter({ onQuickAdd, onExport, onArchive }: { onQuickAdd: () => void; onExport: () => void; onArchive: () => void }) {
  return (
    <Card>
      <SectionTitle title="Action Center" subtitle="Fast monthly workflows." />
      <div className="grid gap-2">
        <Button onClick={onQuickAdd}><Plus aria-hidden className="h-4 w-4" />Add Transaction</Button>
        <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onExport}><FileText aria-hidden className="h-4 w-4" />Generate Report</Button>
        <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onArchive}><Archive aria-hidden className="h-4 w-4" />Archive Month</Button>
      </div>
    </Card>
  );
}

function RecentTransactions({ transactions, currency, locale, onOpen }: { transactions: WorkspaceTransaction[]; currency: string; locale: string; onOpen: (transaction: WorkspaceTransaction) => void }) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Recent Transactions" subtitle="Latest 10 ledger entries for this month." />
        <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => window.location.assign('/transactions/explorer')}>
          <Search aria-hidden className="h-4 w-4" />
          View All Transactions
        </Button>
      </div>
      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions this month"
          message="Record your first expense or import a CSV to activate the workspace."
          action={<Button><Plus aria-hidden className="h-4 w-4" />Record First Expense</Button>}
        />
      ) : (
        <Table>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((transaction) => (
              <tr className="cursor-pointer transition hover:bg-surface-muted/60" key={transaction.id} onClick={() => onOpen(transaction)}>
                <td className="px-3 py-3 text-sm text-muted">{transaction.date}</td>
                <td className="px-3 py-3 text-sm font-medium text-foreground">{transaction.merchantLabel}</td>
                <td className="px-3 py-3 text-sm text-muted">{transaction.categoryName}</td>
                <td className={`px-3 py-3 text-sm font-semibold ${transaction.signedAmount < 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(transaction.signedAmount, currency, locale)}</td>
                <td className="px-3 py-3 text-sm text-muted">{transaction.accountName}</td>
                <td className="px-3 py-3"><span className="rounded-full bg-primary px-2 py-1 text-xs text-muted">{transaction.status}</span></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function QuickAddModal({
  open,
  onClose,
  onSubmit,
  accounts,
  categories,
  defaultDate,
  loading
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => void;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
  defaultDate: string;
  loading: boolean;
}) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { kind: 'expense', date: defaultDate }
  });
  const kind = form.watch('kind');

  return (
    <Modal open={open} title="Quick Add" onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickAddOptions.map((option) => {
            const Icon = option.icon;
            const selected = kind === option.kind;
            return (
              <button
                className={`rounded-brand border px-3 py-2 text-sm transition ${selected ? 'border-accent bg-accent text-white' : 'border-border bg-primary text-muted hover:bg-secondary hover:text-white'}`}
                key={option.kind}
                onClick={() => form.setValue('kind', option.kind)}
                type="button"
              >
                <Icon aria-hidden className="mx-auto mb-1 h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="select" {...form.register('account_id')}>
            <option value="">{kind === 'transfer' ? 'From account' : 'Account'}</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          {kind === 'transfer' ? (
            <select className="select" {...form.register('to_account_id')}>
              <option value="">To account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          ) : (
            <select className="select" {...form.register('category_id')}>
              <option value="">Category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          )}
          <input className="input" type="number" placeholder="Amount" {...form.register('amount')} />
          <input className="input" type="date" {...form.register('date')} />
          <input className="input" placeholder="Merchant / source" {...form.register('merchant')} />
          <input className="input" placeholder="Tags comma separated" {...form.register('tags')} />
          <input className="input sm:col-span-2" placeholder="Receipt or attachment URL" {...form.register('attachment_url')} />
          <textarea className="input min-h-24 sm:col-span-2" placeholder="Notes" {...form.register('notes')} />
        </div>
        <div className="flex justify-end gap-2">
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onClose} type="button">Cancel</Button>
          <Button disabled={loading} type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function ArchiveModal({ open, month, onClose, onArchive }: { open: boolean; month: MonthWindow; onClose: () => void; onArchive: () => void }) {
  return (
    <Modal open={open} title="Archive month" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-brand border border-border bg-primary/50 p-4">
          <div className="flex gap-3">
            <ShieldAlert aria-hidden className="mt-0.5 h-5 w-5 text-purple" />
            <div>
              <p className="font-medium text-foreground">Create an archive marker for {month.label}?</p>
              <p className="mt-1 text-sm text-muted">
                This marks the month archived in this session. Durable snapshot storage needs a dedicated archive persistence layer, so no ledger totals are duplicated here.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onArchive}><Archive aria-hidden className="h-4 w-4" />Archive Month</Button>
        </div>
      </div>
    </Modal>
  );
}

function TransactionDrawer({ transaction, currency, locale, onClose }: { transaction: WorkspaceTransaction | null; currency: string; locale: string; onClose: () => void }) {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/70" onClick={onClose}>
      <aside className="ml-auto h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-5 shadow-card" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Transaction</p>
            <h2 className="mt-1 text-xl font-semibold">{transaction.merchantLabel}</h2>
          </div>
          <button aria-label="Close transaction drawer" className="rounded-md p-2 text-muted hover:bg-secondary hover:text-white" onClick={onClose}>
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <Detail label="Amount" value={formatCurrency(transaction.signedAmount, currency, locale)} />
          <Detail label="Date" value={transaction.date} />
          <Detail label="Category" value={transaction.categoryName} />
          <Detail label="Account" value={transaction.accountName} />
          <Detail label="Status" value={transaction.status} />
          <Detail label="Tags" value={transaction.tags?.join(', ') || 'No tags'} />
          <Detail label="Notes" value={transaction.notes || 'No notes'} />
          <Detail label="Attachments" value={transaction.attachment_url || 'No receipt attached'} />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button className="border border-border bg-transparent text-foreground hover:bg-secondary">Duplicate</Button>
            <Button className="border border-border bg-transparent text-foreground hover:bg-secondary">Edit</Button>
            <Button className="col-span-2 bg-destructive text-destructive-foreground hover:bg-destructive">Delete</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-brand border border-border bg-primary/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
    </div>
  );
}

function MiniEmpty({ title }: { title: string }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-brand border border-dashed border-border text-center">
      <div>
        <CheckCircle2 aria-hidden className="mx-auto h-6 w-6 text-success" />
        <p className="mt-2 text-sm text-muted">{title}</p>
      </div>
    </div>
  );
}

function formatKpiValue(kpi: KPI, currency: string, locale: string) {
  if (kpi.format === 'currency') return formatCurrency(kpi.value, currency, locale);
  if (kpi.format === 'percent') return formatPercent(kpi.value);
  return Math.round(kpi.value).toLocaleString(locale);
}

function parseTags(tags?: string) {
  return tags?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
}

function mapQuickAddKind(kind: TransactionFormValues['kind']): Transaction['type'] {
  if (kind === 'income') return 'income';
  if (kind === 'savings' || kind === 'debt' || kind === 'bill' || kind === 'subscription') return 'expense';
  return 'expense';
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
