import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck2,
  CircleDollarSign,
  Clock3,
  Download,
  Percent,
  PiggyBank,
  Plus,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { DebtsRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { fromMinor, toMinor, type DebtStrategy } from '@/core/debt';
import { formatCurrencyMinorUnits } from '@/core/utils/currency';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, Card, EmptyState, LoadingState, Page } from '@/shared/components';
import type { DebtAccount, DebtSimulationSettings } from '@/types/debt';
import { useDebtSimulation } from './useDebtSimulation';
import {
  exportAmortizationCsv,
  exportAmortizationExcel,
  exportSimulationPdf,
  exportSimulationSummary
} from './exportDebt';
import { DebtOverviewCard } from './components/DebtOverview';
import { DebtStrategySelector } from './components/DebtStrategySelector';
import { DebtCard } from './components/DebtCard';
import { DebtInputModal } from './components/DebtInputModal';
import { DebtTimeline } from './components/DebtTimeline';
import { DebtComparison } from './components/DebtComparison';
import { DebtInsights } from './components/DebtInsights';
import { DebtCharts } from './components/DebtCharts';
import { AmortizationTable } from './components/AmortizationTable';
import { PayoffSummary } from './components/PayoffSummary';
import { DebtDrawer } from './components/DebtDrawer';
import { DebtConfetti } from './components/DebtConfetti';

export default function DebtCenterPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const household = useAuthStore((s) => s.household);
  const currency = household?.default_currency ?? 'USD';

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DebtAccount | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [localSettings, setLocalSettings] = useState<DebtSimulationSettings | null>(null);

  const stateQuery = useQuery({
    queryKey: queryKeys.debts.all(household?.id ?? 'none'),
    queryFn: () => DebtsRepository.getState(household!.id, user!.id),
    enabled: Boolean(household?.id && user?.id)
  });

  useEffect(() => {
    if (stateQuery.data?.settings) {
      setLocalSettings(stateQuery.data.settings);
    }
  }, [stateQuery.data?.settings]);

  const debts = stateQuery.data?.debts ?? [];
  const settings = localSettings ?? stateQuery.data?.settings;

  const simulation = useDebtSimulation(debts, settings ?? {
    strategy: 'avalanche',
    start_month: new Date().getMonth(),
    start_year: new Date().getFullYear(),
    extra_payment_minor: toMinor(300),
    custom_order: [],
    saved_at: null
  });

  const activeDebts = useMemo(
    () => debts.filter((d) => d.status === 'active' && !d.deleted_at).sort((a, b) => a.custom_order - b.custom_order),
    [debts]
  );
  const paidDebts = useMemo(() => debts.filter((d) => d.status === 'paid_off' && !d.deleted_at), [debts]);

  useEffect(() => {
    if (simulation.selected.monthsToPayoff === 0 && activeDebts.length === 0 && paidDebts.length > 0) {
      setShowConfetti(true);
    }
  }, [simulation.selected.monthsToPayoff, activeDebts.length, paidDebts.length]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.debts.all(household!.id) });

  const saveSettingsMutation = useMutation({
    mutationFn: (next: DebtSimulationSettings) => DebtsRepository.saveSimulation(household!.id, user!.id, next),
    onSuccess: invalidate
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof DebtsRepository.create>[0]) => DebtsRepository.create(input),
    onSuccess: () => {
      setModalOpen(false);
      invalidate();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof DebtsRepository.update>[3] }) =>
      DebtsRepository.update(household!.id, user!.id, id, patch),
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      invalidate();
    }
  });

  function patchSettings(partial: Partial<DebtSimulationSettings>) {
    if (!settings) return;
    setLocalSettings({ ...settings, ...partial });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId || !settings) return;
    const ids = activeDebts.map((d) => d.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    patchSettings({ strategy: 'custom', custom_order: ids });
    void DebtsRepository.reorder(household!.id, user!.id, ids).then(invalidate);
    setDragId(null);
  }

  if (!household || !user || stateQuery.isLoading || !settings) {
    return <LoadingState label="Loading Debt Center" />;
  }

  const overview = simulation.overview;
  const minimumMonths = simulation.comparison.minimumBaseline.monthsToPayoff;

  return (
    <Page className="relative">
      <DebtConfetti active={showConfetti} />

      <div className="overflow-hidden rounded-brand border border-border bg-gradient-to-br from-primary via-surface to-secondary/40 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Debt Center</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">Plan, simulate and eliminate your debt faster.</p>
          </div>
          {settings.saved_at ? (
            <p className="text-xs text-muted">Last saved {new Date(settings.saved_at).toLocaleString()}</p>
          ) : null}
        </div>

        <div className="mt-5">
          <DebtStrategySelector
            strategy={settings.strategy}
            startMonth={settings.start_month}
            startYear={settings.start_year}
            extraPaymentMajor={fromMinor(settings.extra_payment_minor)}
            onStrategyChange={(strategy: DebtStrategy) => patchSettings({ strategy })}
            onStartMonthChange={(start_month) => patchSettings({ start_month })}
            onStartYearChange={(start_year) => patchSettings({ start_year })}
            onExtraPaymentChange={(major) => patchSettings({ extra_payment_minor: toMinor(major) })}
            onSave={() => saveSettingsMutation.mutate(settings)}
            onExport={() => setExportOpen(true)}
          />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8" aria-label="Debt overview">
        <DebtOverviewCard
          label="Current Balance"
          value={overview.currentBalanceMinor}
          isMoney
          currency={currency}
          icon={Wallet}
          trend="↓ vs minimum path"
          tooltip="Sum of all active debt balances"
        />
        <DebtOverviewCard
          label="Monthly Payments"
          value={overview.monthlyPaymentsMinor}
          isMoney
          currency={currency}
          icon={CircleDollarSign}
          trend={`Includes $${fromMinor(settings.extra_payment_minor).toFixed(0)} extra`}
          tooltip="Minimums plus selected extra payment"
        />
        <DebtOverviewCard
          label="Total Interest Remaining"
          value={overview.totalInterestRemainingMinor}
          isMoney
          currency={currency}
          icon={TrendingDown}
          trend={`↓ ${formatCurrencyMinorUnits(overview.interestSavedMinor, currency)} saved`}
          tooltip="Projected interest under the selected strategy"
        />
        <DebtOverviewCard
          label="Debt Free Date"
          display={overview.debtFreeDate?.label ?? '—'}
          icon={CalendarCheck2}
          trend={
            minimumMonths > 0 && overview.monthsRemaining > 0
              ? `↓ ${Math.max(0, minimumMonths - overview.monthsRemaining)} months sooner`
              : undefined
          }
          tooltip="Projected month when all debts reach zero"
        />
        <DebtOverviewCard
          label="Months Remaining"
          value={overview.monthsRemaining > 0 ? overview.monthsRemaining : 0}
          icon={Clock3}
          trend={minimumMonths > 0 && overview.monthsRemaining > 0 ? `↓ ${Math.max(0, minimumMonths - overview.monthsRemaining)} months` : undefined}
          tooltip="Months until debt freedom"
        />
        <DebtOverviewCard
          label="Average Interest Rate"
          value={overview.averageInterestRate}
          decimals={2}
          suffix="%"
          icon={Percent}
          tooltip="Balance-weighted average APR"
        />
        <DebtOverviewCard
          label="Interest Saved"
          value={overview.interestSavedMinor}
          isMoney
          currency={currency}
          icon={PiggyBank}
          trend="vs minimum payments"
          tooltip="Interest avoided versus paying minimums only"
        />
        <DebtOverviewCard
          label="Projected Savings"
          value={overview.projectedSavingsMinor}
          isMoney
          currency={currency}
          icon={TrendingDown}
          trend="total paid vs minimums"
          tooltip="Difference in total amount paid versus the minimum-payment baseline"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Your Debts</h2>
            <Button className="h-9 bg-success px-3 text-primary hover:bg-success/90" onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Debt
            </Button>
          </div>
          {settings.strategy === 'custom' ? (
            <p className="text-xs text-muted">Drag cards to set your custom payoff order.</p>
          ) : null}
          {activeDebts.length === 0 ? (
            <EmptyState title="No active debts" message="Add a debt to start simulating payoff strategies." />
          ) : (
            activeDebts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                currency={currency}
                monthsRemaining={simulation.selected.debtPayoffMonths[debt.id] != null ? simulation.selected.debtPayoffMonths[debt.id] + 1 : undefined}
                draggable={settings.strategy === 'custom'}
                onDragStart={() => setDragId(debt.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(debt.id)}
                onEdit={() => { setEditing(debt); setModalOpen(true); }}
                onArchive={() => DebtsRepository.archive(household.id, user.id, debt.id).then(invalidate)}
                onDelete={() => DebtsRepository.remove(household.id, user.id, debt.id).then(invalidate)}
              />
            ))
          )}
          <Card className="flex items-center justify-between text-sm">
            <span className="text-muted">Total balance</span>
            <span className="font-semibold tabular-nums">{formatCurrencyMinorUnits(overview.currentBalanceMinor, currency)}</span>
          </Card>

          {paidDebts.length > 0 ? (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-success">Paid Off</h3>
              {paidDebts.map((debt) => (
                <Card key={debt.id} className="border-success/30 bg-success/5">
                  <div className="font-medium text-foreground">{debt.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    Paid {debt.paid_off_at ? new Date(debt.paid_off_at).toLocaleDateString() : '—'}
                    {debt.months_taken != null ? ` · ${debt.months_taken} months` : ''}
                    {debt.total_interest_paid_minor != null
                      ? ` · Interest ${formatCurrencyMinorUnits(debt.total_interest_paid_minor, currency)}`
                      : ''}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </div>

        <div className="xl:col-span-5">
          <DebtComparison comparison={simulation.comparison} selectedStrategy={settings.strategy} currency={currency} />
        </div>

        <div className="xl:col-span-3 space-y-4">
          <DebtTimeline events={simulation.selected.timeline} />
          <PayoffSummary result={simulation.selected} currency={currency} />
        </div>
      </section>

      <DebtCharts simulation={simulation} debts={debts} currency={currency} />

      <AmortizationTable result={simulation.selected} debts={debts} currency={currency} />

      <DebtInsights insights={simulation.insights} />

      <DebtInputModal
        open={modalOpen}
        debt={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={(values) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, patch: values });
          } else {
            createMutation.mutate({
              ...values,
              household_id: household.id,
              user_id: user.id
            });
          }
        }}
      />

      <DebtDrawer open={exportOpen} title="Export Simulation" onClose={() => setExportOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-muted">Download your simulation summary and amortization schedule.</p>
          <Button
            className="w-full justify-start border border-border bg-transparent text-foreground hover:bg-secondary"
            onClick={() => {
              exportSimulationSummary(settings, simulation.selected, debts);
              setExportOpen(false);
            }}
          >
            <Download className="h-4 w-4" /> Simulation Summary (CSV)
          </Button>
          <Button
            className="w-full justify-start border border-border bg-transparent text-foreground hover:bg-secondary"
            onClick={() => {
              exportAmortizationCsv(simulation.selected, debts);
              setExportOpen(false);
            }}
          >
            <Download className="h-4 w-4" /> Amortization Schedule (CSV)
          </Button>
          <Button
            className="w-full justify-start border border-border bg-transparent text-foreground hover:bg-secondary"
            onClick={() => {
              exportAmortizationExcel(simulation.selected);
              setExportOpen(false);
            }}
          >
            <Download className="h-4 w-4" /> Amortization (Excel)
          </Button>
          <Button
            className="w-full justify-start bg-success text-primary hover:bg-success/90"
            onClick={() => {
              exportSimulationPdf(settings, simulation.selected, debts);
              setExportOpen(false);
            }}
          >
            <Download className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </DebtDrawer>
    </Page>
  );
}
