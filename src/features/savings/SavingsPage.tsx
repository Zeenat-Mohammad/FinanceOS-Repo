import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, getDay, isAfter, parseISO, startOfMonth } from 'date-fns';
import { CalendarDays, Flame, PiggyBank, Plus, Shuffle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, EmptyState, LoadingState, Modal, Page } from '@/shared/components';
import { formatCurrency } from '@/core/utils/currency';
import { queryKeys } from '@/data/query-keys';
import { SavingsRepository } from '@/data/repositories/SavingsRepository';
import { GlassPanel } from '@/features/insights/components/CountrySummary';
import { cn } from '@/core/utils/cn';
import type { ChallengeDay, SavingsChallenge } from '@/types/wealth';

const PRESET_NAMES = ['No Coffee', 'No Swiggy', 'No Amazon', 'No Uber', 'No Shopping', 'No Junk Food', 'No Soda', 'No Online Orders'];

type SavingsTab = 'no-spend' | 'random';

export default function SavingsPage() {
  const { user, profile, household } = useAuthStore();
  const currency = (profile?.currency ?? household?.default_currency ?? 'USD').toUpperCase();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SavingsTab>('no-spend');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<SavingsChallenge | null>(null);
  const [form, setForm] = useState({
    name: 'No Coffee',
    average_cost: 150,
    frequency: 'daily' as SavingsChallenge['frequency'],
    target_days: 30,
    difficulty: 'easy' as SavingsChallenge['difficulty']
  });

  const query = useQuery({
    queryKey: [...queryKeys.savings.bundle(household?.id ?? 'none'), currency],
    enabled: Boolean(household?.id && user?.id),
    queryFn: () => SavingsRepository.loadBundle({ householdId: household!.id, userId: user!.id, currency })
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!household || !user) return;
      const expected =
        form.frequency === 'daily'
          ? form.average_cost * form.target_days
          : form.frequency === 'weekly'
            ? form.average_cost * Math.ceil(form.target_days / 7)
            : form.average_cost * Math.ceil(form.target_days / 30);
      return SavingsRepository.createChallenge({
        household_id: household.id,
        user_id: user.id,
        name: form.name,
        average_cost: form.average_cost,
        frequency: form.frequency,
        target_days: form.target_days,
        expected_savings: expected,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: null,
        difficulty: form.difficulty
      });
    },
    onSuccess: async () => {
      setCreateOpen(false);
      await invalidateSavings();
    }
  });

  const completeChallengeMutation = useMutation({
    mutationFn: (input: { challenge: SavingsChallenge; day: string; amount: number }) =>
      SavingsRepository.completeChallengeDay({
        householdId: household!.id,
        userId: user!.id,
        challengeId: input.challenge.id,
        day: input.day,
        amount: input.amount,
        label: input.challenge.name
      }),
    onSuccess: invalidateSavings
  });

  const completeRandomMutation = useMutation({
    mutationFn: (input: { day: string; amount: number }) =>
      SavingsRepository.completeRandomDay({
        householdId: household!.id,
        userId: user!.id,
        day: input.day,
        amount: input.amount
      }),
    onSuccess: invalidateSavings
  });

  async function invalidateSavings() {
    if (!household?.id) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['savings', household.id] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['calendar', household.id] }),
      queryClient.invalidateQueries({ queryKey: ['savings-challenge-days'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(household.id) })
    ]);
  }

  const noSpendCells = useCalendarCells(query.data?.calendar ?? []);
  const randomCells = useCalendarCells(query.data?.randomCalendar ?? []);
  const activeCalendar = tab === 'no-spend' ? query.data?.calendar ?? [] : query.data?.randomCalendar ?? [];
  const activeCells = tab === 'no-spend' ? noSpendCells : randomCells;

  if (!household || !user) return <LoadingState label="Loading Savings Center" />;
  if (query.isLoading || !query.data) return <LoadingState label="Building savings intelligence" />;

  const b = query.data;
  const money = (n: number) => formatCurrency(n, currency);
  const monthName = format(new Date(), 'MMMM');
  const weekRows = activeCalendar.filter((day) => !isAfter(parseISO(day.day), new Date())).slice(-7);

  return (
    <Page className="space-y-8 pb-16">
      <header className="insights-glass relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(182,215,168,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(58,157,157,0.2),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-white/5 px-3 py-1 text-xs text-muted">
              <PiggyBank className="h-3.5 w-3.5 text-[var(--color-accent-green)]" aria-hidden />
              Savings Center
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Savings Center</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">Live no-spend tracking, challenge checklists, and random daily savings targets.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Challenge
          </Button>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <GlassPanel className="sm:col-span-2">
            <p className="text-xs text-muted">Current Savings</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{money(b.currentSavings)}</p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>Goal {money(b.goalTarget)}</span>
                <span>{b.goalProgressPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[var(--color-accent-green)]" style={{ width: `${b.goalProgressPct}%` }} />
              </div>
            </div>
          </GlassPanel>
          <Stat label="Today's Target" value={money(activeCalendar.find((day) => day.day === format(new Date(), 'yyyy-MM-dd'))?.target ?? b.todaySavings)} />
          <Stat label="Saved This Month" value={money(b.stats.moneySaved)} />
          <Stat label="Completion Rate" value={`${b.stats.completionPct.toFixed(0)}%`} />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Savings Health</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Savings Rate" value={`${b.health.savingsRate.toFixed(0)}%`} />
          <Stat label="Emergency Fund" value={`${b.health.emergencyFundMonths.toFixed(1)} mo`} />
          <Stat label="No Spend Streak" value={`${b.health.noSpendStreak} days`} icon={<Flame className="h-4 w-4 text-orange-300" aria-hidden />} />
          <Stat label="Money Saved" value={money(b.stats.moneySaved)} />
          <Stat label="Current Streak" value={`${b.stats.currentStreak} days`} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">{tab === 'no-spend' ? 'No-Spend Calendar' : 'Random Savings Calendar'}</h2>
              <p className="text-xs text-muted">
                {monthName} · {tab === 'no-spend' ? 'green = no expense transaction · red = spent' : 'tick a day when you save the target'}
              </p>
            </div>
            <div className="flex rounded-brand border border-border/60 bg-white/5 p-1">
              <TabButton active={tab === 'no-spend'} onClick={() => setTab('no-spend')} icon={<CalendarDays className="h-3.5 w-3.5" />}>
                No Spend
              </TabButton>
              <TabButton active={tab === 'random'} onClick={() => setTab('random')} icon={<Shuffle className="h-3.5 w-3.5" />}>
                Random
              </TabButton>
            </div>
          </div>
          <SavingsCalendarGrid
            cells={activeCells}
            currency={currency}
            mode={tab}
            busyDay={completeRandomMutation.variables?.day}
            onCompleteRandom={(day) => completeRandomMutation.mutate({ day: day.day, amount: day.target ?? 0 })}
          />
        </GlassPanel>

        <GlassPanel className="xl:col-span-4">
          <h2 className="text-sm font-semibold">Weekly Saved Calendar</h2>
          <p className="mt-1 text-xs text-muted">Last seven tracked days with saved/spent amounts.</p>
          <div className="mt-4 space-y-2">
            {weekRows.map((day) => (
              <div key={day.day} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{format(parseISO(day.day), 'EEE, MMM d')}</p>
                  <p className="text-xs text-muted">{day.status === 'completed' || day.success ? 'Saved' : day.spent ? 'Spent' : 'Pending'}</p>
                </div>
                <span className={cn('text-sm font-semibold tabular-nums', day.status === 'completed' || day.success ? 'text-success' : day.spent ? 'text-red-300' : 'text-muted')}>
                  {day.status === 'completed' || day.success ? money(day.saved ?? day.amount_saved ?? 0) : day.spent ? money(day.spent) : money(day.target ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Challenge Cards</h2>
            <p className="text-xs text-muted">Click a card to track saved amount by date.</p>
          </div>
          <Button className="h-9 bg-success px-3 text-primary hover:bg-success/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Challenge
          </Button>
        </div>
        {!b.challenges.length ? (
          <EmptyState title="No challenges" message="Create your first savings challenge." action={<Button onClick={() => setCreateOpen(true)}>Create Challenge</Button>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {b.challenges.map((challenge) => {
              const progress = b.challengeStats[challenge.id] ?? challengeProgress(challenge, b.calendar);
              return (
                <button key={challenge.id} type="button" className="text-left" onClick={() => setSelectedChallenge(challenge)}>
                  <GlassPanel className="h-full transition hover:-translate-y-0.5 hover:border-[var(--color-accent-teal)]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted">{challenge.difficulty}</p>
                        <h3 className="mt-1 font-semibold">{challenge.name}</h3>
                      </div>
                      <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] uppercase text-muted">{challenge.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted">Tracked Days</p>
                        <p className="font-semibold">{progress.completed} / {challenge.target_days}</p>
                      </div>
                      <div>
                        <p className="text-muted">Saved</p>
                        <p className="font-semibold">{money(progress.saved || challenge.expected_savings || 0)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px] text-muted">
                        <span>Completion</span>
                        <span>{progress.pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[var(--color-accent-green)]" style={{ width: `${progress.pct}%` }} />
                      </div>
                    </div>
                  </GlassPanel>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-4">
          <h2 className="text-sm font-semibold">Savings Forecast</h2>
          <p className="mt-1 text-xs text-muted">If you continue at today&apos;s target.</p>
          <ul className="mt-4 space-y-3">
            {b.forecast.map((row) => (
              <li key={row.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-sm text-muted">{row.label}</span>
                <span className="font-semibold tabular-nums">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="xl:col-span-8">
          <h2 className="text-sm font-semibold">Savings Breakdown</h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {b.breakdown.map((row) => (
              <li key={row.id} className="rounded-lg bg-white/5 p-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">{row.label}</span>
                  <span className="tabular-nums">{money(row.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--color-accent-teal)]" style={{ width: `${Math.min(100, row.pct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>

      <ChallengeTrackerModal
        challenge={selectedChallenge}
        currency={currency}
        existingDaysQueryKey={household.id}
        onClose={() => setSelectedChallenge(null)}
        onComplete={(challenge, day, amount) => completeChallengeMutation.mutate({ challenge, day, amount })}
        busy={completeChallengeMutation.isPending}
      />

      <CreateChallengeModal
        open={createOpen}
        form={form}
        setForm={setForm}
        loading={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onCreate={() => void createMutation.mutateAsync()}
      />
    </Page>
  );
}

function useCalendarCells(days: ChallengeDay[]) {
  return useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const lead = getDay(monthStart);
    const byDay = new Map(days.map((d) => [d.day, d]));
    const cells: Array<{ key: string; label?: number; day?: ChallengeDay; status: 'success' | 'fail' | 'empty' | 'pending' | 'future' }> = [];
    for (let i = 0; i < lead; i += 1) cells.push({ key: `lead-${i}`, status: 'empty' });
    for (let d = 1; d <= 31; d += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
      if (date.getMonth() !== monthStart.getMonth()) break;
      const key = format(date, 'yyyy-MM-dd');
      const hit = byDay.get(key);
      cells.push({
        key,
        label: d,
        day: hit,
        status: hit?.status === 'future' ? 'future' : hit?.status === 'pending' ? 'pending' : hit?.success || hit?.status === 'completed' ? 'success' : hit ? 'fail' : 'empty'
      });
    }
    return cells;
  }, [days]);
}

function SavingsCalendarGrid({
  cells,
  currency,
  mode,
  busyDay,
  onCompleteRandom
}: {
  cells: ReturnType<typeof useCalendarCells>;
  currency: string;
  mode: SavingsTab;
  busyDay?: string;
  onCompleteRandom: (day: ChallengeDay) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1 text-[10px] text-muted">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <div key={`${d}-${i}`} className="py-1 text-center">
          {d}
        </div>
      ))}
      {cells.map((cell) => {
        const day = cell.day;
        const canTick = mode === 'random' && day && cell.status !== 'future' && cell.status !== 'success';
        return (
          <button
            key={cell.key}
            type="button"
            disabled={!canTick || busyDay === day?.day}
            onClick={() => day && onCompleteRandom(day)}
            className={cn(
              'min-h-20 rounded-lg p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-accent/50',
              cell.status === 'success' && 'bg-[rgba(182,215,168,0.35)] text-[var(--color-accent-green)]',
              cell.status === 'fail' && 'bg-[rgba(244,114,182,0.25)] text-red-200',
              cell.status === 'pending' && 'bg-white/10 text-muted hover:bg-accent/10',
              cell.status === 'future' && 'bg-white/5 text-muted/50',
              cell.status === 'empty' && 'bg-white/5 text-muted'
            )}
          >
            {cell.label ? (
              <span className="flex h-full flex-col justify-between gap-1">
                <span className="font-semibold">{cell.label}</span>
                {mode === 'no-spend' ? (
                  <span>
                    {cell.status === 'success'
                      ? `✓ Saved ${formatCurrency(day?.saved ?? day?.amount_saved ?? 0, currency)}`
                      : day?.spent
                        ? `Spent ${formatCurrency(day.spent, currency)}`
                        : ''}
                  </span>
                ) : (
                  <>
                    <span>{formatCurrency(day?.target ?? 0, currency)}</span>
                    <span>{cell.status === 'success' ? '✓ Saved' : cell.status === 'future' ? 'Future' : 'Tick when saved'}</span>
                  </>
                )}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ChallengeTrackerModal({
  challenge,
  currency,
  existingDaysQueryKey,
  onClose,
  onComplete,
  busy
}: {
  challenge: SavingsChallenge | null;
  currency: string;
  existingDaysQueryKey: string;
  onClose: () => void;
  onComplete: (challenge: SavingsChallenge, day: string, amount: number) => void;
  busy: boolean;
}) {
  const daysQuery = useQuery({
    queryKey: ['savings-challenge-days', existingDaysQueryKey, challenge?.id ?? 'none'],
    enabled: Boolean(challenge),
    queryFn: () => SavingsRepository.listChallengeDays(existingDaysQueryKey, challenge!.id)
  });
  if (!challenge) return null;
  const savedDays = daysQuery.data ?? {};
  const rows = Array.from({ length: challenge.target_days }, (_, index) => {
    const day = format(addDays(parseISO(challenge.start_date), index), 'yyyy-MM-dd');
    const existing = savedDays[day];
    return {
      day,
      amount: existing?.saved ?? existing?.amount_saved ?? challenge.average_cost,
      done: Boolean(existing)
    };
  });
  const completed = rows.filter((row) => row.done).length;
  const saved = rows.reduce((sum, row) => sum + (row.done ? row.amount : 0), 0);
  const pct = Math.min(100, (completed / Math.max(challenge.target_days, 1)) * 100);

  return (
    <Modal open={Boolean(challenge)} title={`${challenge.name} tracker`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-brand border border-border bg-primary/30 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Progress</span>
            <span className="font-semibold">{completed} / {challenge.target_days} days · {formatCurrency(saved, currency)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => (
            <label key={row.day} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-primary/20 px-3 py-2">
              <span>
                <span className="block text-sm font-medium">{format(parseISO(row.day), 'EEE, MMM d')}</span>
                <span className="text-xs text-muted">{formatCurrency(row.amount, currency)}</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-accent"
                checked={row.done}
                disabled={row.done || busy}
                onChange={() => onComplete(challenge, row.day, row.amount)}
              />
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function CreateChallengeModal({
  open,
  form,
  setForm,
  loading,
  onClose,
  onCreate
}: {
  open: boolean;
  form: { name: string; average_cost: number; frequency: SavingsChallenge['frequency']; target_days: number; difficulty: SavingsChallenge['difficulty'] };
  setForm: (next: { name: string; average_cost: number; frequency: SavingsChallenge['frequency']; target_days: number; difficulty: SavingsChallenge['difficulty'] }) => void;
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <Modal open={open} title="Create challenge" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Name</span>
          <select className="select mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
            {PRESET_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
            <option value="Custom Challenge">Custom Challenge</option>
          </select>
        </label>
        {form.name === 'Custom Challenge' ? (
          <input className="input" placeholder="Challenge name" onChange={(e) => setForm({ ...form, name: e.target.value || 'Custom Challenge' })} />
        ) : null}
        <label className="block text-sm">
          <span className="text-muted">Amount to save each day</span>
          <input className="input mt-1" type="number" value={form.average_cost} onChange={(e) => setForm({ ...form, average_cost: Number(e.target.value) })} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Target days</span>
          <input className="input mt-1" type="number" value={form.target_days} onChange={(e) => setForm({ ...form, target_days: Number(e.target.value) })} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Difficulty</span>
          <select className="select mt-1" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as SavingsChallenge['difficulty'] })}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button className="border border-border bg-transparent text-foreground" onClick={onClose}>Cancel</Button>
          <Button disabled={loading} onClick={onCreate}>{loading ? 'Creating…' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition', active ? 'bg-accent text-white' : 'text-muted hover:text-foreground')}
    >
      {icon}
      {children}
    </button>
  );
}

function challengeProgress(challenge: SavingsChallenge, calendar: ChallengeDay[]) {
  const completed = calendar.filter((day) => day.success && day.day >= challenge.start_date).slice(0, challenge.target_days).length;
  const saved = completed * (challenge.average_cost || 0);
  return {
    completed,
    saved,
    pct: Math.min(100, (completed / Math.max(challenge.target_days, 1)) * 100)
  };
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <GlassPanel>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </GlassPanel>
  );
}
