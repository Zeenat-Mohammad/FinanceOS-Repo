import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, getDate, getDay, startOfMonth } from 'date-fns';
import {
  Flame,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  Trophy
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, EmptyState, LoadingState, Modal, Page } from '@/shared/components';
import { formatCurrency } from '@/core/utils/currency';
import { queryKeys } from '@/data/query-keys';
import { SavingsRepository } from '@/data/repositories/SavingsRepository';
import { GlassPanel } from '@/features/insights/components/CountrySummary';
import { cn } from '@/core/utils/cn';
import type { SavingsChallenge } from '@/types/wealth';

const PRESET_NAMES = [
  'No Coffee',
  'No Swiggy',
  'No Amazon',
  'No Uber',
  'No Shopping',
  'No Junk Food',
  'No Soda',
  'No Cigarettes',
  'No Online Orders'
];

export default function SavingsPage() {
  const { user, profile, household } = useAuthStore();
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: 'No Coffee',
    average_cost: 150,
    frequency: 'daily' as SavingsChallenge['frequency'],
    target_days: 30,
    difficulty: 'easy' as SavingsChallenge['difficulty']
  });

  const query = useQuery({
    queryKey: queryKeys.savings.bundle(household?.id ?? 'none'),
    enabled: Boolean(household?.id && user?.id),
    queryFn: () =>
      SavingsRepository.loadBundle({
        householdId: household!.id,
        userId: user!.id,
        currency
      })
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.savings.bundle(household!.id) });
    }
  });

  const calendarCells = useMemo(() => {
    if (!query.data) return [];
    const monthStart = startOfMonth(new Date());
    const lead = getDay(monthStart);
    const days = query.data.calendar;
    const byDay = new Map(days.map((d) => [d.day, d]));
    const cells: Array<{ key: string; label?: number; status?: 'success' | 'fail' | 'empty' }> = [];
    for (let i = 0; i < lead; i += 1) cells.push({ key: `lead-${i}`, status: 'empty' });
    for (let d = 1; d <= 31; d += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
      if (date.getMonth() !== monthStart.getMonth()) break;
      const key = format(date, 'yyyy-MM-dd');
      const hit = byDay.get(key);
      cells.push({
        key,
        label: d,
        status: hit ? (hit.success ? 'success' : 'fail') : getDate(new Date()) >= d ? 'success' : 'empty'
      });
    }
    return cells;
  }, [query.data]);

  if (!household || !user) return <LoadingState label="Loading Savings Center" />;
  if (query.isLoading || !query.data) return <LoadingState label="Building savings intelligence" />;

  const b = query.data;
  const money = (n: number) => formatCurrency(n, currency);
  const monthName = format(new Date(), 'MMMM');

  return (
    <Page className="space-y-8 pb-16">
      <header className="insights-glass relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(182,215,168,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(58,157,157,0.2),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-white/5 px-3 py-1 text-xs text-muted">
              <PiggyBank className="h-3.5 w-3.5 text-[var(--color-accent-green)]" />
              Savings Center
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Savings Center</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">Ledger-derived no-spend streaks and realistic daily savings targets.</p>
          </div>
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
          <Stat label="Today's Target" value={money(b.todaySavings)} />
          <Stat label="Total Saved This Month" value={money(b.monthSavings)} />
          <Stat label="Completion Rate" value={`${b.stats.completionPct.toFixed(0)}%`} />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Savings Health</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Savings Rate" value={`${b.health.savingsRate.toFixed(0)}%`} />
          <Stat label="Emergency Fund" value={`${b.health.emergencyFundMonths.toFixed(1)} mo`} />
          <Stat label="No Spend Streak" value={`${b.health.noSpendStreak} days`} icon={<Flame className="h-4 w-4 text-orange-300" />} />
          <Stat label="Money Saved" value={money(b.health.moneySaved)} />
          <Stat label="Current Streak" value={`${b.stats.currentStreak} days`} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">No-Spend Calendar</h2>
              <p className="text-xs text-muted">{monthName} · green = no spend · red = spent</p>
            </div>
            <Target className="h-4 w-4 text-[var(--color-accent-teal)]" />
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={`${d}-${i}`} className="py-1">
                {d}
              </div>
            ))}
            {calendarCells.map((cell) => (
              <div
                key={cell.key}
                className={cn(
                  'grid min-h-16 rounded-lg p-1.5 text-left text-[10px] font-medium',
                  cell.status === 'success' && 'bg-[rgba(182,215,168,0.35)] text-[var(--color-accent-green)]',
                  cell.status === 'fail' && 'bg-[rgba(244,114,182,0.25)] text-red-200',
                  cell.status === 'empty' && 'bg-white/5 text-muted'
                )}
              >
                {cell.status === 'success' ? '✔' : cell.status === 'fail' ? '✖' : cell.label ?? ''}
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="xl:col-span-5">
          <h2 className="text-sm font-semibold">Statistics</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Current Streak" value={`${b.stats.currentStreak} Days`} />
            <Stat label="Longest" value={`${b.stats.longestStreak} Days`} />
            <Stat label="Money Saved" value={money(b.stats.moneySaved)} />
            <Stat label="Goal" value={`${b.stats.goalDays} Days`} />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Completion</span>
              <span>{b.stats.completionPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--color-accent-teal)]" style={{ width: `${b.stats.completionPct}%` }} />
            </div>
          </div>
        </GlassPanel>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Challenge Cards</h2>
          <p className="text-xs text-muted">Unlimited challenges · ledger-aware savings estimates</p>
        </div>
        {!b.challenges.length ? (
          <EmptyState title="No challenges" message="Create your first habit challenge." action={<Button onClick={() => setCreateOpen(true)}>Create Challenge</Button>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {b.challenges.map((challenge) => {
              const saved = (challenge.average_cost || 0) * Math.min(challenge.target_days, b.stats.currentStreak);
              const completion = Math.min(100, (b.stats.currentStreak / challenge.target_days) * 100);
              return (
                <GlassPanel key={challenge.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted">{challenge.difficulty}</p>
                      <h3 className="mt-1 font-semibold">{challenge.name}</h3>
                    </div>
                    <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] uppercase text-muted">{challenge.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted">Current</p>
                      <p className="font-semibold">{b.stats.currentStreak} Days</p>
                    </div>
                    <div>
                      <p className="text-muted">Money Saved</p>
                      <p className="font-semibold">{money(saved || challenge.expected_savings || 0)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] text-muted">
                      <span>Completion</span>
                      <span>{completion.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[var(--color-accent-green)]" style={{ width: `${completion}%` }} />
                    </div>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-4">
          <h2 className="text-sm font-semibold">Savings Forecast</h2>
          <p className="mt-1 text-xs text-muted">If you continue…</p>
          <ul className="mt-4 space-y-3">
            {b.forecast.map((row) => (
              <li key={row.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-sm text-muted">{row.label}</span>
                <span className="font-semibold tabular-nums">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="xl:col-span-4">
          <h2 className="text-sm font-semibold">Habit Analytics</h2>
          <p className="mt-1 text-xs text-muted">GitHub-style consistency heatmap</p>
          <div className="mt-4 space-y-1">
            {b.heatmap.map((week) => (
              <div key={week.week} className="flex gap-1">
                {week.days.map((day, i) => (
                  <div
                    key={`${week.week}-${i}`}
                    className={cn(
                      'h-3.5 w-3.5 rounded-sm',
                      day === 'green' && 'bg-[var(--color-accent-green)]',
                      day === 'yellow' && 'bg-amber-300/80',
                      day === 'red' && 'bg-red-400/80',
                      day === 'empty' && 'bg-white/10'
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="xl:col-span-4">
          <h2 className="text-sm font-semibold">Savings Breakdown</h2>
          <ul className="mt-3 space-y-2">
            {b.breakdown.map((row) => (
              <li key={row.id}>
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

      <section className="grid gap-4 lg:grid-cols-2">
        <GlassPanel>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--color-accent-purple)]" />
            <h2 className="text-sm font-semibold">Achievements</h2>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {b.achievements.map((a) => (
              <li
                key={a.id}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm',
                  a.unlocked ? 'border-[rgba(182,215,168,0.35)] bg-[rgba(182,215,168,0.12)]' : 'border-border/40 bg-white/5 text-muted'
                )}
              >
                {a.label}
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="ring-1 ring-[rgba(180,167,214,0.3)]">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-accent-purple)]" />
            <h2 className="text-sm font-semibold">AI Suggestions</h2>
          </div>
          <ul className="space-y-3">
            {b.aiSuggestions.map((s) => (
              <li key={s.id}>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-muted">{s.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-muted">
            Pulls income, expenses, transfers, and savings balances from your ledger automatically. Only challenge settings need manual input.
          </p>
        </GlassPanel>
      </section>

      <Modal open={createOpen} title="Create challenge" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-muted">Name</span>
            <select className="select mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
              {PRESET_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="Custom Challenge">Custom Challenge</option>
            </select>
          </label>
          {form.name === 'Custom Challenge' ? (
            <input className="input" placeholder="Challenge name" onChange={(e) => setForm({ ...form, name: e.target.value || 'Custom Challenge' })} />
          ) : null}
          <label className="block text-sm">
            <span className="text-muted">Average cost</span>
            <input className="input mt-1" type="number" value={form.average_cost} onChange={(e) => setForm({ ...form, average_cost: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Frequency</span>
            <select className="select mt-1" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as SavingsChallenge['frequency'] })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
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
            <Button className="border border-border bg-transparent text-foreground" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={createMutation.isPending} onClick={() => void createMutation.mutateAsync()}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
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
