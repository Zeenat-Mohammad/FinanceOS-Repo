import type { PaymentInstance } from '@/core/recurring';
import { cn } from '@/core/utils/cn';

export type PaymentBadgeTone = 'income' | 'expense' | 'pending' | 'overdue' | 'paid' | 'skipped';

const toneStyles: Record<PaymentBadgeTone, string> = {
  income: 'border-success/30 bg-success/15 text-success',
  expense: 'border-purple/30 bg-purple/15 text-purple',
  pending: 'border-accent/30 bg-accent/15 text-accent',
  overdue: 'border-destructive/40 bg-destructive/15 text-destructive',
  paid: 'border-success/20 bg-success/10 text-success/70',
  skipped: 'border-border bg-surface-muted/40 text-muted'
};

export function resolvePaymentBadgeTone(instance: PaymentInstance): PaymentBadgeTone {
  if (instance.status === 'paid') return 'paid';
  if (instance.status === 'skipped') return 'skipped';
  if (instance.status === 'overdue') return 'overdue';
  if (instance.status === 'pending') return 'pending';
  return instance.transaction_type === 'income' ? 'income' : 'expense';
}

export function PaymentBadge({
  instance,
  label,
  className,
  compact
}: {
  instance: PaymentInstance;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const tone = resolvePaymentBadgeTone(instance);

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded-md border px-2 font-medium',
        compact ? 'py-0.5 text-[10px]' : 'py-1 text-xs',
        toneStyles[tone],
        className
      )}
      title={label ?? instance.name}
    >
      {label ?? instance.name}
    </span>
  );
}
