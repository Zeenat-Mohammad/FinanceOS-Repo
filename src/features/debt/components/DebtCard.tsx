import { useState, type DragEvent } from 'react';
import { Car, CreditCard, GraduationCap, Home, Landmark, MoreHorizontal, Pencil, Archive, Trash2, ChevronDown } from 'lucide-react';
import type { DebtAccount, DebtType } from '@/types/debt';
import { formatCurrencyMinorUnits } from '@/core/utils/currency';
import { Button, Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

const TYPE_META: Record<DebtType, { label: string; icon: typeof CreditCard }> = {
  credit_card: { label: 'Credit Card', icon: CreditCard },
  personal_loan: { label: 'Personal Loan', icon: Landmark },
  car_loan: { label: 'Car Loan', icon: Car },
  mortgage: { label: 'Mortgage', icon: Home },
  student_loan: { label: 'Student Loan', icon: GraduationCap },
  other: { label: 'Other', icon: MoreHorizontal }
};

export function DebtCard({
  debt,
  monthsRemaining,
  currency,
  onEdit,
  onArchive,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop
}: {
  debt: DebtAccount;
  monthsRemaining?: number;
  currency: string;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[debt.type];
  const Icon = meta.icon;
  const original = Math.max(debt.original_balance_minor, debt.balance_minor);
  const progress = original > 0 ? Math.min(100, ((original - debt.balance_minor) / original) * 100) : 0;

  return (
    <Card
      className={cn('transition hover:border-accent/35', draggable && 'cursor-grab active:cursor-grabbing')}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-brand bg-primary p-2.5 text-accent">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="truncate font-semibold text-foreground">{debt.name}</h3>
              <p className="text-xs text-muted">
                {meta.label} · {debt.apr_percent.toFixed(2)}% APR
              </p>
            </div>
            <button type="button" className="rounded-md p-1 text-muted hover:bg-primary hover:text-foreground" onClick={() => setExpanded((v) => !v)} aria-label="Expand debt">
              <ChevronDown className={cn('h-4 w-4 transition', expanded && 'rotate-180')} />
            </button>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-muted">Remaining</div>
              <div className="text-lg font-semibold tabular-nums">{formatCurrencyMinorUnits(debt.balance_minor, currency)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Min payment</div>
              <div className="text-sm tabular-nums text-foreground">{formatCurrencyMinorUnits(debt.minimum_payment_minor, currency)}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>{progress.toFixed(0)}% paid</span>
              {monthsRemaining != null && monthsRemaining >= 0 ? <span>{monthsRemaining} mo left</span> : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {expanded ? (
            <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted">
              {debt.lender ? <div>Lender: {debt.lender}</div> : null}
              {debt.due_day ? <div>Due day: {debt.due_day}</div> : null}
              <div>Monthly payment: {formatCurrencyMinorUnits(debt.monthly_payment_minor, currency)}</div>
              {debt.notes ? <div>Notes: {debt.notes}</div> : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button className="action-button h-8 px-2 text-xs" onClick={onEdit}>
                  <Pencil className="h-3 w-3" /> Quick Edit
                </Button>
                <Button className="action-button h-8 px-2 text-xs" onClick={onArchive}>
                  <Archive className="h-3 w-3" /> Archive
                </Button>
                <Button className="h-8 bg-destructive px-2 text-xs text-destructive-foreground hover:bg-destructive" onClick={onDelete}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export { TYPE_META };
