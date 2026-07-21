import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Check, Loader2, Pencil, SkipForward, Trash2, X } from 'lucide-react';
import type { PaymentInstance } from '@/core/recurring';
import type { RecurringRule } from '@/types/database';
import type { CalendarFinancialEvent } from '@/data/repositories/CalendarRepository';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import { Button } from '@/shared/components';
import { PaymentBadge } from './PaymentBadge';

const STATUS_ORDER = ['overdue', 'pending', 'paid', 'skipped'] as const;

export function DayDrawer({
  date,
  instances,
  events = [],
  rules,
  currency,
  markingId,
  onClose,
  onMarkPaid,
  onSkip,
  onEditReminder,
  onDeleteReminder
}: {
  date: string;
  instances: PaymentInstance[];
  events?: CalendarFinancialEvent[];
  rules: Map<string, RecurringRule>;
  currency: string;
  markingId?: string | null;
  onClose: () => void;
  onMarkPaid: (instance: PaymentInstance) => void;
  onSkip: (instance: PaymentInstance) => void;
  onEditReminder?: (reminderId: string) => void;
  onDeleteReminder?: (reminderId: string) => void;
}) {
  const sorted = [...instances].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  const actionable = sorted.filter((instance) => instance.status === 'pending' || instance.status === 'overdue');
  const completed = sorted.filter((instance) => instance.status === 'paid' || instance.status === 'skipped');
  const summary = events.reduce(
    (totals, event) => {
      if (event.kind === 'income') totals.income += event.amount;
      if (event.kind === 'expense' || event.kind === 'debt' || event.kind === 'transfer') totals.expenses += event.amount;
      if (event.kind === 'savings') totals.savings += event.amount;
      if (event.kind === 'investment') totals.investments += event.amount;
      if (event.kind === 'recurring') totals.recurring += event.amount;
      totals.net = totals.income - totals.expenses - totals.savings - totals.investments;
      return totals;
    },
    { income: 0, expenses: 0, savings: 0, investments: 0, recurring: 0, net: 0 }
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-5 shadow-card animate-in slide-in-from-right"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{format(parseISO(date), 'EEEE, MMMM d')}</h2>
            <p className="mt-1 text-sm text-muted">
              {events.length === 0 && instances.length === 0
                ? 'No financial activity'
                : `${events.length || instances.length} event${(events.length || instances.length) === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button
            className="border border-border bg-transparent px-2 text-foreground hover:bg-secondary"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <section className="mt-5 grid grid-cols-2 gap-2">
          <SummaryPill label="Income" value={summary.income} currency={currency} tone="income" />
          <SummaryPill label="Expenses" value={summary.expenses} currency={currency} tone="expense" />
          <SummaryPill label="Savings" value={summary.savings} currency={currency} tone="savings" />
          <SummaryPill label="Investments" value={summary.investments} currency={currency} tone="investment" />
          <SummaryPill label="Recurring" value={summary.recurring} currency={currency} tone="recurring" />
          <SummaryPill label="Daily Net" value={summary.net} currency={currency} tone={summary.net >= 0 ? 'income' : 'expense'} />
        </section>

        {events.length > 0 ? (
          <section className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Financial timeline</h3>
            <ul className="mt-3 space-y-2">
              {events.map((event) => (
                <li key={event.id} className="rounded-brand border border-border/80 bg-primary/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {[event.category, event.account, event.status].filter(Boolean).join(' · ') || event.kind}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        event.kind === 'income' && 'text-success',
                        event.kind === 'expense' && 'text-destructive',
                        event.kind === 'savings' && 'text-accent',
                        event.kind === 'investment' && 'text-purple',
                        event.kind === 'recurring' && 'text-amber-500 dark:text-amber-300',
                        event.kind === 'reminder' && 'text-accent'
                      )}
                    >
                      {event.amount > 0 ? (
                        <>
                          {event.kind === 'income' ? '+' : '-'}
                          {formatCurrency(event.amount, currency)}
                        </>
                      ) : event.time ? (
                        event.time.slice(0, 5)
                      ) : (
                        event.status
                      )}
                    </span>
                  </div>
                  {event.caption ? <p className="mt-2 text-xs text-muted">{event.caption}</p> : null}
                  {event.kind === 'reminder' && event.reminderId ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="action-button h-8 px-3 text-xs"
                        onClick={() => onEditReminder?.(event.reminderId!)}
                      >
                        <Pencil aria-hidden className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        className="h-8 border border-destructive/30 bg-destructive/10 px-3 text-xs text-destructive hover:bg-destructive/15"
                        onClick={() => onDeleteReminder?.(event.reminderId!)}
                      >
                        <Trash2 aria-hidden className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {instances.length === 0 && events.length === 0 ? (
          <div className="mt-8 rounded-brand border border-dashed border-border bg-primary/20 p-6 text-center">
            <p className="text-sm text-muted">Nothing scheduled for this day.</p>
            <Link to="/recurring" className="mt-3 inline-flex text-sm font-medium text-accent hover:underline">
              Manage recurring payments →
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {actionable.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Due</h3>
                <ul className="mt-3 space-y-3">
                  {actionable.map((instance) => (
                    <DayPaymentRow
                      key={instance.id}
                      instance={instance}
                      rule={rules.get(instance.recurring_rule_id)}
                      currency={currency}
                      markingId={markingId}
                      onMarkPaid={onMarkPaid}
                      onSkip={onSkip}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {completed.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Completed</h3>
                <ul className="mt-3 space-y-3">
                  {completed.map((instance) => (
                    <DayPaymentRow
                      key={instance.id}
                      instance={instance}
                      rule={rules.get(instance.recurring_rule_id)}
                      currency={currency}
                      markingId={markingId}
                      onMarkPaid={onMarkPaid}
                      onSkip={onSkip}
                      completed
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}

        <div className="mt-8 border-t border-border pt-4">
          <Link to="/recurring" className="text-sm font-medium text-accent hover:underline">
            Edit recurring rules →
          </Link>
        </div>
      </aside>
    </div>
  );
}

function DayPaymentRow({
  instance,
  rule,
  currency,
  markingId,
  onMarkPaid,
  onSkip,
  completed
}: {
  instance: PaymentInstance;
  rule?: RecurringRule;
  currency: string;
  markingId?: string | null;
  onMarkPaid: (instance: PaymentInstance) => void;
  onSkip: (instance: PaymentInstance) => void;
  completed?: boolean;
}) {
  const busy = markingId === instance.id;
  const checked = instance.status === 'paid' || instance.status === 'skipped';
  const canMarkPaid = !completed && (instance.status === 'pending' || instance.status === 'overdue');
  const canSkip = !completed && instance.status !== 'skipped' && instance.status !== 'paid';
  const missingAccount = canMarkPaid && !rule?.account_id;

  return (
    <li className="rounded-brand border border-border/80 bg-primary/20 p-3">
      <div className="flex items-start gap-3">
        <label className="mt-1 flex shrink-0 items-center">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-accent"
            checked={checked}
            disabled={completed || busy || !canMarkPaid || Boolean(missingAccount)}
            onChange={() => onMarkPaid(instance)}
            aria-label={`Mark ${instance.name} as paid`}
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{instance.name}</span>
            <PaymentBadge instance={instance} compact />
          </div>
          <div
            className={cn(
              'mt-1 text-sm tabular-nums',
              instance.transaction_type === 'income' ? 'text-success' : 'text-foreground'
            )}
          >
            {instance.transaction_type === 'income' ? '+' : '-'}
            {formatCurrency(instance.amount, currency)}
          </div>
          {missingAccount ? (
            <p className="mt-1 text-xs text-destructive">Assign an account on the recurring rule before marking paid.</p>
          ) : null}
          {instance.status === 'paid' && instance.paid_date ? (
            <p className="mt-1 text-xs text-muted">Paid {instance.paid_date}</p>
          ) : null}
        </div>
      </div>

      {!completed ? (
        <div className="mt-3 flex flex-wrap gap-2 pl-7">
          <Button
            className="h-8 bg-success px-3 text-xs text-primary hover:bg-success/90"
            disabled={busy || !canMarkPaid || Boolean(missingAccount)}
            onClick={() => onMarkPaid(instance)}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Mark Paid
          </Button>
          <Button
            className="h-8 border border-border bg-transparent px-3 text-xs text-foreground hover:bg-secondary"
            disabled={busy || !canSkip}
            onClick={() => onSkip(instance)}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
            Skip
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function SummaryPill({
  label,
  value,
  currency,
  tone
}: {
  label: string;
  value: number;
  currency: string;
  tone: 'income' | 'expense' | 'savings' | 'investment' | 'recurring';
}) {
  return (
    <div className="rounded-brand border border-border/70 bg-primary/20 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums',
          tone === 'income' && 'text-success',
          tone === 'expense' && 'text-destructive',
          tone === 'savings' && 'text-accent',
          tone === 'investment' && 'text-purple',
          tone === 'recurring' && 'text-amber-500 dark:text-amber-300'
        )}
      >
        {formatCurrency(value, currency)}
      </p>
    </div>
  );
}
