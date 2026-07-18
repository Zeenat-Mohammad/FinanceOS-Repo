import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { RecurringRepository, buildRuleMetadata } from '@/data/repositories/RecurringRepository';
import { queryKeys } from '@/data/query-keys';
import { Button, LoadingState, Page } from '@/shared/components';
import { useAuthStore } from '@/features/auth/authStore';
import { useLedgerContext } from '@/features/ledger/useLedgerContext';
import { EmptyWidget } from '@/features/dashboard/components/EmptyWidget';
import { cn } from '@/core/utils/cn';
import { useRecurringWorkspace, type EnrichedRecurring } from './useRecurringWorkspace';
import { RecurringStats } from './components/RecurringStats';
import { RecurringFilters } from './components/RecurringFilters';
import { RecurringCard } from './components/RecurringCard';
import { AddRecurringModal, type RecurringFormPayload } from './components/AddRecurringModal';
import { RecurringSummaryPanel } from './components/RecurringSummaryPanel';

function invalidateRecurring(queryClient: ReturnType<typeof useQueryClient>, householdId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.recurring.workspace(householdId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.recurring.rules });
  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(householdId) });
  void queryClient.invalidateQueries({ queryKey: ['calendar', householdId] });
}

function payloadToRuleInput(payload: RecurringFormPayload, householdId: string) {
  return {
    household_id: householdId,
    name: payload.name,
    transaction_type: payload.transaction_type,
    category_id: payload.category_id,
    account_id: payload.account_id,
    amount: payload.amount,
    currency: payload.currency,
    cadence: payload.cadence,
    starts_on: payload.starts_on,
    next_occurrence_on: payload.next_occurrence_on,
    metadata: buildRuleMetadata({
      kind: payload.kind,
      reminder_days: payload.reminder_days,
      auto_create_transaction: payload.auto_create_transaction,
      description: payload.description
    })
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function cadenceFromLabel(value: string): RecurringFormPayload['cadence'] {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'yearly' || normalized === 'annual') return 'annual';
  if (normalized === 'daily') return 'daily';
  if (normalized === 'weekly') return 'weekly';
  return 'monthly';
}

export default function RecurringPage() {
  const { user, household, loading } = useLedgerContext();
  const profile = useAuthStore((s) => s.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const queryClient = useQueryClient();
  const workspace = useRecurringWorkspace(household?.id);
  const importRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EnrichedRecurring | null>(null);

  const upcomingInstances = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return workspace.instances
      .filter((i) => (i.status === 'pending' || i.status === 'overdue') && i.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [workspace.instances]);

  const invalidate = () => {
    if (!household?.id) return;
    invalidateRecurring(queryClient, household.id);
  };

  const createMutation = useMutation({
    mutationFn: (payload: RecurringFormPayload) =>
      RecurringRepository.createRule(payloadToRuleInput(payload, household!.id)),
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      invalidate();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecurringFormPayload }) =>
      RecurringRepository.updateRule(id, payloadToRuleInput(payload, household!.id)),
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      invalidate();
    }
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => RecurringRepository.pauseRule(id),
    onSuccess: invalidate
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => RecurringRepository.resumeRule(id),
    onSuccess: invalidate
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => RecurringRepository.completeRule(id),
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => RecurringRepository.removeRule(id),
    onSuccess: invalidate
  });

  const markPaidMutation = useMutation({
    mutationFn: (item: EnrichedRecurring) => {
      if (!household?.id || !user?.id || !item.nextInstance) {
        throw new Error('Missing payment instance or account.');
      }
      return RecurringRepository.markPaid({
        householdId: household.id,
        userId: user.id,
        instance: item.nextInstance,
        rule: item.rule
      });
    },
    onSuccess: invalidate
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV must include a header row and at least one data row.');

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = (name: string) => headers.indexOf(name);

      for (let i = 1; i < lines.length; i += 1) {
        const cols = parseCsvLine(lines[i]);
        const name = cols[idx('name')];
        if (!name) continue;

        const payload: RecurringFormPayload = {
          name,
          transaction_type: (cols[idx('type')]?.toLowerCase() === 'income' ? 'income' : 'expense') as RecurringFormPayload['transaction_type'],
          kind: (cols[idx('kind')]?.toLowerCase() || 'bill') as RecurringFormPayload['kind'],
          category_id: null,
          account_id: null,
          amount: Number(cols[idx('amount')] || 0),
          currency: (cols[idx('currency')] || currency).toUpperCase(),
          cadence: cadenceFromLabel(cols[idx('frequency')] || 'monthly'),
          starts_on: cols[idx('start date')] || cols[idx('starts_on')] || new Date().toISOString().slice(0, 10),
          next_occurrence_on: cols[idx('next payment date')] || cols[idx('next_occurrence_on')] || cols[idx('start date')] || new Date().toISOString().slice(0, 10),
          reminder_days: Number(cols[idx('reminder days')] || cols[idx('reminder_days')] || 3),
          auto_create_transaction: (cols[idx('auto create')] || cols[idx('auto_create')] || 'true').toLowerCase() !== 'false',
          description: cols[idx('description')] || undefined
        };

        const categoryName = cols[idx('category')];
        const accountName = cols[idx('account')];
        if (categoryName) {
          const match = workspace.categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
          if (match) payload.category_id = match.id;
        }
        if (accountName) {
          const match = workspace.accounts.find((a) => a.name.toLowerCase() === accountName.toLowerCase());
          if (match) payload.account_id = match.id;
        }

        await RecurringRepository.createRule(payloadToRuleInput(payload, household!.id));
      }
    },
    onSuccess: invalidate
  });

  if (loading || workspace.isLoading) return <LoadingState label="Loading recurring payments" />;

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: EnrichedRecurring) {
    setEditing(item);
    setModalOpen(true);
  }

  function exportCsv() {
    const header = [
      'Name',
      'Type',
      'Kind',
      'Category',
      'Account',
      'Amount',
      'Currency',
      'Frequency',
      'Start Date',
      'Next Payment Date',
      'Reminder Days',
      'Auto Create',
      'Description',
      'Status'
    ].join(',');

    const rows = workspace.enriched.map((item) =>
      [
        `"${item.rule.name.replace(/"/g, '""')}"`,
        item.rule.transaction_type,
        item.meta.kind,
        `"${item.categoryName.replace(/"/g, '""')}"`,
        `"${item.accountName.replace(/"/g, '""')}"`,
        item.rule.amount ?? 0,
        item.rule.currency,
        item.rule.cadence === 'annual' ? 'yearly' : item.rule.cadence,
        item.rule.starts_on,
        item.nextDue,
        item.meta.reminder_days,
        item.meta.auto_create_transaction,
        `"${(item.meta.description || '').replace(/"/g, '""')}"`,
        item.rule.status
      ].join(',')
    );

    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finlo-recurring.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleMarkPaid(item: EnrichedRecurring) {
    if (!item.rule.account_id) {
      window.alert('Assign an account before marking this payment as paid.');
      return;
    }
    if (!item.nextInstance) {
      window.alert('No upcoming payment instance found.');
      return;
    }
    markPaidMutation.mutate(item);
  }

  const defaultStats = {
    totalCount: 0,
    expenseCount: 0,
    incomeCount: 0,
    monthlyExpense: 0,
    monthlyIncome: 0,
    monthlyNet: 0,
    dueThisMonthCount: 0,
    dueThisMonthAmount: 0,
    paidThisMonthCount: 0,
    paidThisMonthAmount: 0,
    upcoming7Count: 0,
    upcoming7Amount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    activeSubscriptions: 0,
    yearlyExpense: 0,
    yearlyIncome: 0
  };

  return (
    <Page className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(180,167,214,0.14),_transparent_55%)]" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recurring Payments</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">Track bills, subscriptions, and income on autopilot.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
              e.target.value = '';
            }}
          />
          <Button
            className="border border-border bg-transparent text-foreground hover:bg-secondary"
            onClick={() => importRef.current?.click()}
            disabled={!household || importMutation.isPending}
          >
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button className="bg-success text-primary hover:bg-success/90" onClick={openCreate} disabled={!household}>
            <Plus className="h-4 w-4" /> Add Recurring
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <RecurringStats stats={workspace.stats ?? defaultStats} currency={currency} />

          <RecurringFilters
            search={workspace.search}
            onSearch={workspace.setSearch}
            statusTab={workspace.statusTab}
            onStatusTab={workspace.setStatusTab}
            tabCounts={workspace.tabCounts}
            filter={workspace.filter}
            onFilter={workspace.setFilter}
            sort={workspace.sort}
            onSort={workspace.setSort}
            view={workspace.view}
            onView={workspace.setView}
          />

          {workspace.filtered.length === 0 ? (
            <EmptyWidget
              title={
                workspace.statusTab === 'paused'
                  ? 'No paused payments'
                  : workspace.statusTab === 'completed'
                    ? 'No completed payments'
                    : 'Track your bills automatically'
              }
              message={
                workspace.statusTab === 'paused'
                  ? 'Pause an active recurring item to park it here.'
                  : workspace.statusTab === 'completed'
                    ? 'Mark a recurring rule as completed when you no longer need it.'
                    : 'Add your first recurring payment to stay ahead of due dates.'
              }
              ctaLabel={workspace.statusTab === 'current' ? 'Add your first' : 'View current'}
              onCta={
                workspace.statusTab === 'current'
                  ? openCreate
                  : () => workspace.setStatusTab('current')
              }
            />
          ) : (
            <section
              className={cn(
                'grid gap-4',
                workspace.view === 'grid' ? 'sm:grid-cols-2' : 'grid-cols-1'
              )}
              aria-label="Recurring payment cards"
            >
              {workspace.filtered.map((item) => (
                <RecurringCard
                  key={item.rule.id}
                  item={item}
                  currency={currency}
                  layout={workspace.view}
                  onEdit={() => openEdit(item)}
                  onMarkPaid={() => handleMarkPaid(item)}
                  onPause={() => pauseMutation.mutate(item.rule.id)}
                  onResume={() => resumeMutation.mutate(item.rule.id)}
                  onComplete={() => {
                    if (window.confirm(`Mark “${item.rule.name}” as completed?`)) {
                      completeMutation.mutate(item.rule.id);
                    }
                  }}
                  onDelete={() => {
                    if (window.confirm(`Delete “${item.rule.name}” permanently?`)) {
                      deleteMutation.mutate(item.rule.id);
                    }
                  }}
                />
              ))}
            </section>
          )}
        </div>

        <div className="hidden xl:block">
          <RecurringSummaryPanel
            stats={workspace.stats ?? defaultStats}
            upcomingInstances={upcomingInstances}
            insights={workspace.insights}
            currency={currency}
          />
        </div>
      </div>

      <AddRecurringModal
        open={modalOpen}
        rule={editing?.rule ?? null}
        accounts={workspace.accounts}
        categories={workspace.categories}
        defaultCurrency={currency}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={(payload) => {
          if (editing) {
            updateMutation.mutate({ id: editing.rule.id, payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />
    </Page>
  );
}
