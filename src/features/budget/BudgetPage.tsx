import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Copy, Gauge, Pencil, Plus, RotateCcw, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { CategoriesRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, Card, EmptyState, LoadingState, Modal, Page, PageHeader, StatCard } from '@/shared/components';
import type { BudgetCategoryRow, BudgetPeriod } from '@/types/intelligence';
import { useBudgetIntelligence } from './useBudgetIntelligence';
import { parseMonthValue, shiftMonth, useMonthlyBudget } from './useMonthlyBudget';

const COLORS = ['#3a9d9d', '#b6d7a8', '#b4a7d6', '#474f7a', '#cf7d7d', '#d8b36a'];

export default function BudgetPage() {
  const user = useAuthStore((state) => state.user);
  const household = useAuthStore((state) => state.household);
  const profile = useAuthStore((state) => state.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const [monthCursor, setMonthCursor] = useState(new Date());
  const budget = useBudgetIntelligence(household?.id, user?.id);
  const monthlyBudget = useMonthlyBudget(household?.id, user?.id, monthCursor);
  const categories = useQuery({ queryKey: queryKeys.categories.all, queryFn: CategoriesRepository.list });
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const expenseCategories = (categories.data ?? []).filter((category) => category.type === 'expense' && !category.deleted_at);

  if (!household || !user || budget.isLoading) return <LoadingState label="Loading budget intelligence" />;
  if (!budget.data) return <EmptyState title="Budget intelligence unavailable" message="Apply the latest database migration, then retry." />;
  const { rows, kpis, monthlyTrend, distribution } = budget.data;

  function openEditor(row?: BudgetCategoryRow) {
    setCategoryId(row?.id ?? expenseCategories[0]?.id ?? '');
    setAmount(row?.budget.toString() ?? '');
    setPeriod(row?.period ?? 'monthly');
    setStartDate(row?.periodStart ?? '');
    setEndDate(row?.periodEnd ?? '');
    setEditorOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    budget.update.mutate(
      {
        categoryId,
        budgetAmount: amount ? Number(amount) : null,
        budgetPeriod: period,
        budgetStartDate: period === 'custom' ? startDate : null,
        budgetEndDate: period === 'custom' ? endDate : null,
        alertsEnabled: true
      },
      { onSuccess: () => setEditorOpen(false) }
    );
  }

  return (
    <Page className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(58,157,157,0.18),_transparent_58%)]" />
      <PageHeader
        title="Monthly Budgets"
        description="Month-based category budgets that update automatically from ledger transactions."
        action={
          <div className="flex flex-wrap gap-2">
            <Button className="border border-border bg-white text-foreground hover:bg-secondary" onClick={() => monthlyBudget.copyPrevious.mutate()} disabled={monthlyBudget.copyPrevious.isPending}>
              <Copy className="h-4 w-4" /> Copy previous month
            </Button>
            <Button className="border border-border bg-white text-foreground hover:bg-secondary" onClick={() => monthlyBudget.archiveMonth.mutate()} disabled={monthlyBudget.archiveMonth.isPending}>
              <RotateCcw className="h-4 w-4" /> Archive month
            </Button>
            <Button className="bg-success text-primary hover:bg-success/90" onClick={() => openEditor()} disabled={!expenseCategories.length}><Plus className="h-4 w-4" /> Set budget</Button>
          </div>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--color-card-foreground)]">{monthlyBudget.query.data?.label ?? 'Current month'}</h2>
            <p className="text-sm text-[var(--color-card-muted)]">Allocated {formatCurrency(monthlyBudget.query.data?.totals.allocated ?? 0, currency)} · Spent {formatCurrency(monthlyBudget.query.data?.totals.spent ?? 0, currency)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="border border-border bg-white text-foreground hover:bg-secondary" onClick={() => setMonthCursor((value) => shiftMonth(value, -1))}>Previous</Button>
            <select className="select" value={`${monthCursor.getFullYear()}-${monthCursor.getMonth()}`} onChange={(event) => setMonthCursor(parseMonthValue(event.target.value))}>
              {monthlyBudget.monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button className="border border-border bg-white text-foreground hover:bg-secondary" onClick={() => setMonthCursor((value) => shiftMonth(value, 1))}>Next</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(monthlyBudget.query.data?.rows ?? []).map((row) => (
            <div key={row.category_name} className="rounded-brand border border-border bg-surface-muted/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-[var(--color-card-foreground)]">{row.category_name}</div>
                <span className="text-[10px] uppercase text-[var(--color-card-muted)]">{row.status}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--color-card-muted)]">
                <div>Budget<br /><strong className="text-[var(--color-card-foreground)]">{formatCurrency(row.allocated, currency)}</strong></div>
                <div>Spent<br /><strong className="text-[var(--color-card-foreground)]">{formatCurrency(row.spent, currency)}</strong></div>
                <div>Remaining<br /><strong className="text-[var(--color-card-foreground)]">{formatCurrency(row.remaining, currency)}</strong></div>
                <div>Forecast<br /><strong className="text-[var(--color-card-foreground)]">{formatCurrency(row.forecast, currency)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Budget utilization" value={`${kpis.utilizationPct.toFixed(0)}%`} hint={`${rows.length} active category budgets`} />
        <StatCard label="Remaining budget" value={formatCurrency(kpis.remainingBudget, currency)} hint={`Average ${formatCurrency(kpis.averageSpending, currency)} / month`} />
        <StatCard label="Predicted period end" value={formatCurrency(kpis.predictedPeriodEndSpending, currency)} hint={`${kpis.accuracyPct.toFixed(0)}% budget accuracy`} />
        <StatCard label="Budget efficiency" value={`${kpis.efficiencyPct.toFixed(0)}%`} hint={kpis.highestSpendingMonth ? `Highest: ${kpis.highestSpendingMonth.month}` : 'No spending history'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <h2 className="font-semibold text-foreground">Budget vs actual</h2>
          <div className="mt-3 h-72"><ResponsiveContainer><BarChart data={monthlyTrend}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="month" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} /><YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} /><Tooltip formatter={(value: number) => formatCurrency(value, currency)} /><Legend /><Bar dataKey="budget" fill="#474f7a" radius={[5, 5, 0, 0]} /><Bar dataKey="actual" fill="#3a9d9d" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="xl:col-span-5">
          <h2 className="font-semibold text-foreground">Category distribution</h2>
          <div className="mt-3 h-72"><ResponsiveContainer><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={2}>{distribution.map((entry, index) => <Cell key={entry.name} fill={entry.color ?? COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => formatCurrency(value, currency)} /><Legend /></PieChart></ResponsiveContainer></div>
        </Card>
      </section>

      {rows.length === 0 ? (
        <EmptyState title="No category budgets yet" message="Set a budget on an expense category. Actual spending is always derived from posted ledger transactions." action={<Button onClick={() => openEditor()}>Set first budget</Button>} />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => <BudgetCard key={row.id} row={row} currency={currency} onEdit={() => openEditor(row)} />)}
        </section>
      )}

      <Card>
        <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-accent" /><h2 className="font-semibold text-foreground">Intelligence model</h2></div>
        <p className="mt-2 text-sm text-muted">Predictions use the current period’s daily run rate. Accuracy compares predicted period-end spending with the assigned budget; efficiency measures budget remaining. Refunds reduce actual spending.</p>
      </Card>

      <Modal open={editorOpen} title="Category budget settings" onClose={() => setEditorOpen(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-xs font-medium text-muted">Category<select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}><option value="">Select category</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="block text-xs font-medium text-muted">Budget amount ({currency})<input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></label>
          <label className="block text-xs font-medium text-muted">Period<select value={period} onChange={(e) => setPeriod(e.target.value as BudgetPeriod)} className={inputClass}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="custom">Custom</option></select></label>
          {period === 'custom' ? <div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-muted">Start<input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></label><label className="text-xs font-medium text-muted">End<input required min={startDate} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} /></label></div> : null}
          {budget.update.error ? <p className="text-sm text-destructive">{budget.update.error.message}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => setEditorOpen(false)}>Cancel</Button><Button type="submit" disabled={budget.update.isPending}>Save budget</Button></div>
        </form>
      </Modal>
    </Page>
  );
}

function BudgetCard({ row, currency, onEdit }: { row: BudgetCategoryRow; currency: string; onEdit: () => void }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-wide text-muted">{row.period}</div><h2 className="mt-1 font-semibold text-foreground">{row.name}</h2></div><button aria-label={`Edit ${row.name} budget`} className="rounded-md border border-border p-2 text-muted hover:bg-secondary hover:text-foreground" onClick={onEdit}><Pencil className="h-4 w-4" /></button></div>
      <div className="mt-4 flex items-end justify-between"><div><div className="text-2xl font-semibold text-foreground">{formatCurrency(row.spent, currency)}</div><div className="text-xs text-muted">of {formatCurrency(row.budget, currency)}</div></div><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase', row.alertStatus === 'healthy' ? 'bg-success/15 text-success' : row.alertStatus === 'watch' ? 'bg-purple/15 text-purple' : 'bg-destructive/15 text-destructive')}>{row.alertStatus}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/30"><div className={cn('h-full rounded-full transition-all duration-700', row.alertStatus === 'exceeded' ? 'bg-destructive' : 'bg-gradient-to-r from-accent to-success')} style={{ width: `${Math.min(100, row.utilizationPct)}%` }} /></div>
      <div className="mt-2 flex justify-between text-xs"><span className={row.remaining < 0 ? 'text-destructive' : 'text-success'}>{row.remaining < 0 ? 'Over ' : 'Remaining '}{formatCurrency(Math.abs(row.remaining), currency)}</span><span className="text-muted">{row.utilizationPct.toFixed(0)}%</span></div>
      <div className="mt-4 h-24"><ResponsiveContainer><LineChart data={row.monthlyHistory}><Line type="monotone" dataKey="amount" stroke="#b4a7d6" strokeWidth={2} dot={false} /><Tooltip formatter={(value: number) => formatCurrency(value, currency)} /><XAxis dataKey="month" hide /><YAxis hide /></LineChart></ResponsiveContainer></div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">{row.monthlyTrendPct > 0 ? <TrendingUp className="h-4 w-4 text-destructive" /> : <TrendingDown className="h-4 w-4 text-success" />} Monthly trend {Math.abs(row.monthlyTrendPct).toFixed(0)}% {row.monthlyTrendPct > 0 ? 'higher' : 'lower'}</div>
      {row.alertStatus !== 'healthy' ? <div className="mt-3 flex gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /> Review this category before the period ends.</div> : <div className="mt-3 flex gap-2 rounded-md bg-success/10 p-2 text-xs text-success"><WalletCards className="h-4 w-4 shrink-0" /> Spending is within plan.</div>}
    </Card>
  );
}

const inputClass = 'mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

