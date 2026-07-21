import { memo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  CalendarClock,
  Bell,
  CheckCircle2,
  CreditCard,
  Flag,
  MoreHorizontal,
  Pause,
  Pencil,
  PiggyBank,
  Play,
  Receipt,
  Repeat,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/core/utils/currency';
import { Button, Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { RecurringKind } from '@/core/recurring';
import type { EnrichedRecurring, RecurringView } from '../useRecurringWorkspace';

function kindIcon(kind: RecurringKind) {
  switch (kind) {
    case 'subscription':
      return Repeat;
    case 'bill':
      return Receipt;
    case 'debt':
      return CreditCard;
    case 'savings':
      return PiggyBank;
    case 'income':
      return TrendingUp;
    default:
      return CalendarClock;
  }
}

function cadenceLabel(cadence: string) {
  switch (cadence) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'annual':
      return 'Yearly';
    case 'biweekly':
      return 'Biweekly';
    case 'quarterly':
      return 'Quarterly';
    default:
      return cadence;
  }
}

function statusStyle(label: string) {
  switch (label) {
    case 'Overdue':
      return 'bg-destructive/15 text-destructive';
    case 'Due Soon':
      return 'bg-[#E8A87C]/15 text-[#c47b3a]';
    case 'Paused':
      return 'bg-secondary/50 text-muted';
    case 'Completed':
      return 'bg-accent/15 text-accent';
    default:
      return 'bg-success/15 text-success';
  }
}

function typeStyle(type: string) {
  return type === 'income' ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent';
}

export const RecurringCard = memo(function RecurringCard({
  item,
  currency,
  layout,
  onEdit,
  onMarkPaid,
  onPause,
  onResume,
  onComplete,
  onDelete
}: {
  item: EnrichedRecurring;
  currency: string;
  layout: RecurringView;
  onEdit: () => void;
  onMarkPaid: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = kindIcon(item.meta.kind);
  const isPaused = item.rule.status === 'paused';
  const isCompleted = item.rule.status === 'ended';
  const canMarkPaid = !isPaused && !isCompleted && item.nextInstance && item.rule.account_id;
  const reminderLabel = item.meta.reminder_enabled
    ? `${item.meta.reminder_time.slice(0, 5)} · ${item.meta.reminder_email || 'email pending'}`
    : 'Off';

  return (
    <Card
      className={cn(
        'group relative transition duration-200 hover:-translate-y-0.5',
        layout === 'list' && 'flex flex-col sm:flex-row sm:items-center sm:gap-4'
      )}
    >
      <div className={cn('relative flex min-w-0 flex-1 items-start justify-between gap-2', layout === 'list' && 'sm:items-center')}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-brand bg-primary text-accent">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{item.rule.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', typeStyle(item.rule.transaction_type))}>
                {item.rule.transaction_type}
              </span>
              <span className="inline-flex rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {item.meta.kind}
              </span>
              <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', statusStyle(item.statusLabel))}>
                {item.statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Recurring menu"
            className="rounded-md p-1.5 text-muted hover:bg-primary hover:text-foreground"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-brand border border-border bg-surface p-1 shadow-card">
              {canMarkPaid ? <MenuItem label="Mark Paid" onClick={() => { setMenuOpen(false); onMarkPaid(); }} /> : null}
              {!isCompleted ? <MenuItem label="Edit" onClick={() => { setMenuOpen(false); onEdit(); }} /> : null}
              {isCompleted ? (
                <MenuItem label="Resume" onClick={() => { setMenuOpen(false); onResume(); }} />
              ) : isPaused ? (
                <MenuItem label="Resume" onClick={() => { setMenuOpen(false); onResume(); }} />
              ) : (
                <>
                  <MenuItem label="Pause" onClick={() => { setMenuOpen(false); onPause(); }} />
                  <MenuItem label="Complete" onClick={() => { setMenuOpen(false); onComplete(); }} />
                </>
              )}
              <MenuItem label="Delete" danger onClick={() => { setMenuOpen(false); onDelete(); }} />
            </div>
          ) : null}
        </div>
      </div>

      <div className={cn('relative mt-3 grid gap-2 text-xs text-muted', layout === 'list' ? 'mt-0 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5' : 'sm:grid-cols-2')}>
        <Metric label="Amount" value={`${formatCurrency(item.rule.amount ?? 0, currency)} / ${cadenceLabel(item.rule.cadence)}`} />
        <Metric label="Next payment" value={format(parseISO(item.nextDue), 'MMM d, yyyy')} />
        <Metric label="Category" value={item.categoryName} />
        <Metric label="Account" value={item.accountName} />
        <Metric label="Email reminder" value={reminderLabel} icon={Bell} />
      </div>

      <div className={cn('relative mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3', layout === 'list' && 'mt-0 border-t-0 pt-0 sm:shrink-0 sm:border-l sm:border-border/60 sm:pl-4')}>
        {!isCompleted ? (
          <Button
            className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary disabled:opacity-50"
            disabled={!canMarkPaid}
            onClick={onMarkPaid}
          >
            <CheckCircle2 className="h-3 w-3" /> Mark Paid
          </Button>
        ) : null}
        {!isCompleted ? (
          <Button className="action-button h-8 px-2 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        ) : null}
        {isCompleted ? (
          <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={onResume}>
            <Play className="h-3 w-3" /> Resume
          </Button>
        ) : isPaused ? (
          <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={onResume}>
            <Play className="h-3 w-3" /> Resume
          </Button>
        ) : (
          <>
            <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={onPause}>
              <Pause className="h-3 w-3" /> Pause
            </Button>
            <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={onComplete}>
              <Flag className="h-3 w-3" /> Complete
            </Button>
          </>
        )}
        <Button className="h-8 bg-destructive px-2 text-xs text-destructive-foreground hover:bg-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" /> Delete
        </Button>
      </div>
    </Card>
  );
});

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Bell }) {
  return (
    <div className="rounded-md border border-border/50 bg-primary/40 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted">
        {Icon ? <Icon aria-hidden className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn('w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-primary', danger && 'text-destructive')}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
