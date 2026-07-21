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
  Wallet,
  type LucideIcon
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
  const progressPct = Math.min(
    100,
    Math.max(
      0,
      overview.interestSavedMinor > 0
        ? (overview.interestSavedMinor / Math.max(overview.interestSavedMinor + overview.totalInterestRemainingMinor, 1)) * 100
        : minimumMonths > 0
          ? ((minimumMonths - overview.monthsRemaining) / minimumMonths) * 100
          : activeDebts.length === 0
            ? 100
            : 0
    )
  );

  return (
    <Page className="relative">
      <DebtConfetti active={showConfetti} />

      <div className="debt-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-5 text-white shadow-[0_28px_90px_rgba(31,37,68,0.35)] sm:p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[var(--color-accent-teal)]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-20 h-64 w-64 rounded-full bg-[var(--color-accent-purple)]/25 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-8 h-32 w-32 rounded-full bg-[var(--color-accent-green)]/20 blur-2xl" />
        <Wallet className="pointer-events-none absolute right-10 top-10 h-16 w-16 rotate-6 text-white/5" aria-hidden />
        <PiggyBank className="pointer-events-none absolute bottom-16 left-1/2 h-20 w-20 -rotate-12 text-white/5" aria-hidden />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/75 backdrop-blur">
              <TrendingDown className="h-3.5 w-3.5 text-[var(--color-accent-green)]" aria-hidden />
              Current strategy · {settings.strategy}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Debt Center</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">Plan, simulate and eliminate your debt faster with a payoff path that stays motivating.</p>
            {settings.saved_at ? (
              <p className="mt-3 text-xs text-white/55">Last saved {new Date(settings.saved_at).toLocaleString()}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem]">
            <HeroMetric label="Total Debt" value={formatCurrencyMinorUnits(overview.currentBalanceMinor, currency)} icon={Wallet} />
            <HeroMetric label="Monthly Payment" value={formatCurrencyMinorUnits(overview.monthlyPaymentsMinor, currency)} icon={CircleDollarSign} />
            <HeroMetric label="Debt-Free Date" value={overview.debtFreeDate?.label ?? '—'} icon={CalendarCheck2} />
            <HeroMetric label="Interest Saved" value={formatCurrencyMinorUnits(overview.interestSavedMinor, currency)} icon={PiggyBank} />
          </div>
        </div>

        <div className="relative mt-6 grid gap-4 xl:grid-cols-[14rem_1fr]">
          <div className="grid place-items-center rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div
              className="grid h-36 w-36 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--color-accent-green) ${progressPct * 3.6}deg, rgba(255,255,255,.16) 0deg)`
              }}
              aria-label={`${progressPct.toFixed(0)} percent debt payoff progress`}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-[rgba(31,37,68,0.82)] text-center shadow-inner">
                <div>
                  <p className="text-3xl font-semibold tabular-nums">{progressPct.toFixed(0)}%</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/55">progress</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-white/65">{overview.monthsRemaining} estimated months remaining</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
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

function HeroMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">{label}</p>
        <Icon className="h-4 w-4 text-[var(--color-accent-green)]" aria-hidden />
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
