import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Check, Loader2, SkipForward, X } from 'lucide-react';
import type { PaymentInstance } from '@/core/recurring';
import type { RecurringRule } from '@/types/database';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import { Button } from '@/shared/components';
import { PaymentBadge } from './PaymentBadge';

const STATUS_ORDER = ['overdue', 'pending', 'paid', 'skipped'] as const;

export function DayDrawer({
  date,
  instances,
  rules,
  currency,
  markingId,
  onClose,
  onMarkPaid,
  onSkip
}: {
  date: string;
  instances: PaymentInstance[];
  rules: Map<string, RecurringRule>;
  currency: string;
  markingId?: string | null;
  onClose: () => void;
  onMarkPaid: (instance: PaymentInstance) => void;
  onSkip: (instance: PaymentInstance) => void;
}) {
  const sorted = [...instances].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  const actionable = sorted.filter((instance) => instance.status === 'pending' || instance.status === 'overdue');
  const completed = sorted.filter((instance) => instance.status === 'paid' || instance.status === 'skipped');

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
              {instances.length === 0
                ? 'No scheduled payments'
                : `${instances.length} payment${instances.length === 1 ? '' : 's'}`}
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

        {instances.length === 0 ? (
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
