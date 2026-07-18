import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Modal } from '@/shared/components';
import type { DebtAccount, DebtType } from '@/types/debt';
import { fromMinor, toMinor } from '@/core/debt';
import { TYPE_META } from './DebtCard';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['credit_card', 'personal_loan', 'car_loan', 'mortgage', 'student_loan', 'other']),
  balance: z.coerce.number().min(0),
  apr_percent: z.coerce.number().min(0).max(100),
  minimum_payment: z.coerce.number().min(0),
  monthly_payment: z.coerce.number().min(0),
  due_day: z.coerce.number().min(1).max(31).optional().or(z.literal('')),
  extra_payment_allowed: z.boolean(),
  lender: z.string().optional(),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function DebtInputModal({
  open,
  debt,
  onClose,
  onSubmit
}: {
  open: boolean;
  debt: DebtAccount | null;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    type: DebtType;
    balance_minor: number;
    original_balance_minor?: number;
    apr_percent: number;
    minimum_payment_minor: number;
    monthly_payment_minor: number;
    due_day: number | null;
    extra_payment_allowed: boolean;
    lender: string | null;
    notes: string | null;
  }) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'credit_card',
      balance: 0,
      apr_percent: 0,
      minimum_payment: 0,
      monthly_payment: 0,
      due_day: '',
      extra_payment_allowed: true,
      lender: '',
      notes: ''
    }
  });

  useEffect(() => {
    if (!open) return;
    if (debt) {
      form.reset({
        name: debt.name,
        type: debt.type,
        balance: fromMinor(debt.balance_minor),
        apr_percent: debt.apr_percent,
        minimum_payment: fromMinor(debt.minimum_payment_minor),
        monthly_payment: fromMinor(debt.monthly_payment_minor),
        due_day: debt.due_day ?? '',
        extra_payment_allowed: debt.extra_payment_allowed,
        lender: debt.lender ?? '',
        notes: debt.notes ?? ''
      });
    } else {
      form.reset({
        name: '',
        type: 'credit_card',
        balance: 0,
        apr_percent: 0,
        minimum_payment: 0,
        monthly_payment: 0,
        due_day: '',
        extra_payment_allowed: true,
        lender: '',
        notes: ''
      });
    }
  }, [debt, open, form]);

  return (
    <Modal open={open} title={debt ? 'Edit Debt' : 'Add Debt'} onClose={onClose}>
      <form
        className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => {
          onSubmit({
            name: values.name,
            type: values.type,
            balance_minor: toMinor(values.balance),
            original_balance_minor: debt ? undefined : toMinor(values.balance),
            apr_percent: values.apr_percent,
            minimum_payment_minor: toMinor(values.minimum_payment),
            monthly_payment_minor: toMinor(values.monthly_payment),
            due_day: values.due_day === '' || values.due_day == null ? null : Number(values.due_day),
            extra_payment_allowed: values.extra_payment_allowed,
            lender: values.lender?.trim() || null,
            notes: values.notes?.trim() || null
          });
        })}
      >
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Debt Name</span>
          <input className="input" {...form.register('name')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Debt Type</span>
          <select className="select" {...form.register('type')}>
            {(Object.keys(TYPE_META) as DebtType[]).map((type) => (
              <option key={type} value={type}>
                {TYPE_META[type].label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Interest Rate (APR %)</span>
          <input className="input" type="number" step="0.01" {...form.register('apr_percent')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Current Balance</span>
          <input className="input" type="number" step="0.01" {...form.register('balance')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Minimum Payment</span>
          <input className="input" type="number" step="0.01" {...form.register('minimum_payment')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Current Monthly Payment</span>
          <input className="input" type="number" step="0.01" {...form.register('monthly_payment')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Due Day</span>
          <input className="input" type="number" min={1} max={31} {...form.register('due_day')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Lender</span>
          <input className="input" {...form.register('lender')} />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" {...form.register('extra_payment_allowed')} />
          <span className="text-sm text-muted">Extra payment allowed</span>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Notes</span>
          <textarea className="input min-h-20" {...form.register('notes')} />
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-success text-primary hover:bg-success/90">
            {debt ? 'Save Changes' : 'Add Debt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
