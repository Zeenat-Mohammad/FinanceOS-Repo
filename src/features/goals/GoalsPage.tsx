import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Plus, Target } from 'lucide-react';
import { AccountsRepository } from '@/data/repositories';
import { InvestmentRepository } from '@/data/repositories/insights/InvestmentRepository';
import { queryKeys } from '@/data/query-keys';
import { useAuthStore } from '@/features/auth/authStore';
import { formatCurrency } from '@/core/utils/currency';
import { Button, Card, EmptyState, LoadingState, Modal, Page, PageHeader, StatCard } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { GoalPriority, GoalType, SmartGoalView } from '@/types/intelligence';
import { useGoals } from './useGoals';

const GOAL_TYPES: Array<{ value: GoalType; label: string }> = [
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'house', label: 'House' },
  { value: 'car', label: 'Car' },
  { value: 'education', label: 'Education' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'business', label: 'Business' },
  { value: 'investment', label: 'Investment' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'custom', label: 'Custom' }
];

const EMPTY_FORM = {
  name: '',
  description: '',
  goalType: 'emergency_fund' as GoalType,
  priority: 'medium' as GoalPriority,
  targetAmount: '',
  currentAmount: '0',
  targetDate: '',
  monthlyContribution: '',
  linkedAccountId: '',
  linkedInvestmentId: '',
  autoContribution: false,
  inflationAdjustment: '0',
  imagePath: '',
  notes: ''
};

export default function GoalsPage() {
  const user = useAuthStore((state) => state.user);
  const household = useAuthStore((state) => state.household);
  const profile = useAuthStore((state) => state.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const goals = useGoals(household?.id, user?.id);
  const accountsQuery = useQuery({ queryKey: queryKeys.accounts.all, queryFn: AccountsRepository.list });
  const holdingsQuery = useQuery({
    queryKey: queryKeys.insights.holdings(household?.id ?? 'none'),
    queryFn: () => InvestmentRepository.list(household!.id, user!.id, currency),
    enabled: Boolean(household && user)
  });
  const [formOpen, setFormOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<SmartGoalView | null>(null);
  const [contribution, setContribution] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const completionData = useMemo(
    () => [
      { name: 'Saved', value: goals.data?.kpis.totalSaved ?? 0, color: '#b6d7a8' },
      {
        name: 'Remaining',
        value: Math.max(0, (goals.data?.kpis.totalTargetAmount ?? 0) - (goals.data?.kpis.totalSaved ?? 0)),
        color: '#474f7a'
      }
    ],
    [goals.data]
  );

  if (!household || !user || goals.isLoading) return <LoadingState label="Loading SMART goals" />;
  if (!goals.data) return <EmptyState title="SMART goals unavailable" message="Apply the latest database migration, then try again." />;
  const { kpis, monthlyContributions, upcomingContributions } = goals.data;

  function submitGoal(event: FormEvent) {
    event.preventDefault();
    goals.create.mutate(
      {
        household_id: household!.id,
        user_id: user!.id,
        name: form.name.trim(),
        description: form.description.trim(),
        goal_type: form.goalType,
        priority: form.priority,
        target_amount: Number(form.targetAmount),
        current_amount: Number(form.currentAmount || 0),
        currency,
        target_date: form.targetDate || null,
        expected_monthly_contribution: Number(form.monthlyContribution || 0),
        linked_account_id: form.linkedAccountId || null,
        linked_investment_id: form.linkedInvestmentId || null,
        auto_contribution: form.autoContribution,
        inflation_adjustment_pct: Number(form.inflationAdjustment || 0),
        goal_image_path: form.imagePath.trim() || null,
        notes: form.notes.trim() || null
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setFormOpen(false);
        }
      }
    );
  }

  return (
    <Page className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(180,167,214,0.18),_transparent_58%)]" />
      <PageHeader
        title="SMART Goal Planner"
        description="Specific, measurable, achievable, relevant and time-bound goals with live funding forecasts."
        action={<Button className="bg-success text-primary hover:bg-success/90" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New goal</Button>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total goals" value={kpis.totalGoals} hint={`${kpis.completedGoals} completed`} />
        <StatCard label="On track" value={kpis.onTrack} hint={`${kpis.behindSchedule} behind schedule`} />
        <StatCard label="Needs attention" value={kpis.needsAttention} hint="High risk or overdue" />
        <StatCard label="Average completion" value={`${kpis.averageCompletion.toFixed(0)}%`} hint={`${formatCurrency(kpis.totalSaved, currency)} saved`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <h2 className="font-semibold text-foreground">Goal completion</h2>
          <div className="relative mt-3 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={completionData} dataKey="value" innerRadius={70} outerRadius={96} stroke="none">
                  {completionData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center"><div className="text-3xl font-semibold text-foreground">{kpis.averageCompletion.toFixed(0)}%</div><div className="text-xs text-muted">funded</div></div>
            </div>
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <h2 className="font-semibold text-foreground">Contribution history</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={monthlyContributions}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                <Bar dataKey="amount" fill="#3a9d9d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="xl:col-span-3">
          <h2 className="font-semibold text-foreground">Upcoming contributions</h2>
          <div className="mt-4 space-y-3">
            {upcomingContributions.length ? upcomingContributions.map((item) => (
              <div key={item.goalId} className="rounded-brand border border-border/60 bg-primary/20 p-3">
                <div className="text-sm font-medium text-foreground">{item.goalName}</div>
                <div className="mt-1 flex justify-between text-xs text-muted"><span>{item.date}</span><span>{formatCurrency(item.amount, currency)}</span></div>
              </div>
            )) : <p className="text-sm text-muted">No scheduled contributions.</p>}
          </div>
        </Card>
      </section>

      {goals.data.goals.length === 0 ? (
        <EmptyState title="Create your first SMART goal" message="Add a target, date and monthly contribution to receive a live feasibility forecast." action={<Button onClick={() => setFormOpen(true)}>Create goal</Button>} />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {goals.data.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              onContribute={() => { setContributionGoal(goal); setContribution(''); }}
              onToggle={() => goals.update.mutate({ id: goal.id, input: { status: goal.status === 'paused' ? 'active' : 'paused' } })}
            />
          ))}
        </section>
      )}

      <Modal open={formOpen} title="Create SMART goal" onClose={() => setFormOpen(false)}>
        <form className="max-h-[72vh] space-y-4 overflow-y-auto pr-1" onSubmit={submitGoal}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Goal name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
            <Field label="Goal type"><select value={form.goalType} onChange={(e) => setForm({ ...form, goalType: e.target.value as GoalType })} className={inputClass}>{GOAL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
          </div>
          <Field label="Specific description"><textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as GoalPriority })} className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field>
            <Field label={`Target amount (${currency})`}><input required min="0.01" step="0.01" type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} className={inputClass} /></Field>
            <Field label="Current saved"><input min="0" step="0.01" type="number" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} className={inputClass} /></Field>
            <Field label="Target date"><input required type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className={inputClass} /></Field>
            <Field label="Expected monthly contribution"><input min="0" step="0.01" type="number" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} className={inputClass} /></Field>
            <Field label="Inflation adjustment %"><input min="0" max="100" step="0.1" type="number" value={form.inflationAdjustment} onChange={(e) => setForm({ ...form, inflationAdjustment: e.target.value })} className={inputClass} /></Field>
            <Field label="Linked account"><select value={form.linkedAccountId} onChange={(e) => setForm({ ...form, linkedAccountId: e.target.value })} className={inputClass}><option value="">None</option>{accountsQuery.data?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field>
            <Field label="Linked investment"><select value={form.linkedInvestmentId} onChange={(e) => setForm({ ...form, linkedInvestmentId: e.target.value })} className={inputClass}><option value="">None</option>{holdingsQuery.data?.filter((holding) => !holding.id.startsWith('account:')).map((holding) => <option key={holding.id} value={holding.id}>{holding.name}</option>)}</select></Field>
          </div>
          <Field label="Goal image URL or storage path"><input value={form.imagePath} onChange={(e) => setForm({ ...form, imagePath: e.target.value })} className={inputClass} /></Field>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.autoContribution} onChange={(e) => setForm({ ...form, autoContribution: e.target.checked })} /> Enable automatic contribution tracking</label>
          {goals.create.error ? <p className="text-sm text-destructive">{goals.create.error.message}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={goals.create.isPending}>Create goal</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(contributionGoal)} title={`Contribute to ${contributionGoal?.name ?? 'goal'}`} onClose={() => setContributionGoal(null)}>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!contributionGoal) return;
          goals.contribute.mutate({ goalId: contributionGoal.id, amount: Number(contribution), accountId: contributionGoal.linked_account_id }, { onSuccess: () => setContributionGoal(null) });
        }}>
          <Field label={`Amount (${currency})`}><input autoFocus required min="0.01" step="0.01" type="number" value={contribution} onChange={(e) => setContribution(e.target.value)} className={inputClass} /></Field>
          <p className="mt-2 text-xs text-muted">This records goal progress. It does not create a duplicate ledger transaction.</p>
          <div className="mt-5 flex justify-end gap-2"><Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => setContributionGoal(null)}>Cancel</Button><Button type="submit" disabled={goals.contribute.isPending}>Add contribution</Button></div>
        </form>
      </Modal>
    </Page>
  );
}

function GoalCard({ goal, currency, onContribute, onToggle }: { goal: SmartGoalView; currency: string; onContribute: () => void; onToggle: () => void }) {
  const progress = [{ month: 'Now', value: goal.current_amount }, { month: 'Target', value: goal.target_amount }];
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent"><Target className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">{goal.name}</h2><p className="mt-1 line-clamp-2 text-xs text-muted">{goal.description}</p></div></div>
        <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase', goal.riskLevel === 'low' ? 'bg-success/15 text-success' : goal.riskLevel === 'medium' ? 'bg-purple/15 text-purple' : 'bg-destructive/15 text-destructive')}>{goal.riskLevel} risk</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/30"><div className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-700" style={{ width: `${goal.completionPct}%` }} /></div>
      <div className="mt-2 flex justify-between text-xs"><span className="text-muted">{formatCurrency(goal.current_amount, currency)} saved</span><span className="font-semibold text-foreground">{goal.completionPct.toFixed(0)}%</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Metric icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="Required / month" value={formatCurrency(goal.requiredMonthlySaving, currency)} />
        <Metric icon={<CalendarClock className="h-3.5 w-3.5" />} label="Forecast" value={goal.estimatedCompletionDate ?? 'Contribution needed'} />
        <Metric icon={goal.isAchievable ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} label="SMART score" value={`${goal.smartScore}/100`} />
        <Metric icon={<CircleDollarSign className="h-3.5 w-3.5" />} label={goal.monthlyDeficit ? 'Monthly deficit' : 'Monthly surplus'} value={formatCurrency(goal.monthlyDeficit || goal.monthlySurplus, currency)} />
      </div>
      <div className="mt-4 h-20">
        <ResponsiveContainer><AreaChart data={progress}><defs><linearGradient id={`goal-${goal.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3a9d9d" stopOpacity={0.45} /><stop offset="95%" stopColor="#3a9d9d" stopOpacity={0} /></linearGradient></defs><Area dataKey="value" stroke="#3a9d9d" fill={`url(#goal-${goal.id})`} /></AreaChart></ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-2"><Button className="flex-1 bg-success text-primary hover:bg-success/90" onClick={onContribute}>Add contribution</Button>{goal.status !== 'completed' ? <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onToggle}>{goal.status === 'paused' ? 'Resume' : 'Pause'}</Button> : null}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-medium text-muted"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-brand border border-border/60 bg-primary/20 p-2.5"><div className="flex items-center gap-1 text-muted">{icon}{label}</div><div className="mt-1 truncate font-semibold text-foreground">{value}</div></div>;
}

const inputClass = 'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

