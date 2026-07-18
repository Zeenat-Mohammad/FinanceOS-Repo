import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Modal } from '@/shared/components';
import { PaymentEngine } from '@/core/recurring';
import type { RecurringRule } from '@/types/database';
import type { Category } from '@/types/finance';
import type { Account } from '@/types/finance';
import type { CreateRecurringPayload } from '@/data/repositories/RecurringRepository';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  transaction_type: z.enum(['income', 'expense']),
  kind: z.enum(['subscription', 'bill', 'debt', 'savings', 'income', 'other']),
  category_id: z.string().optional(),
  account_id: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Amount required'),
  currency: z.string().min(3).max(3),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  starts_on: z.string().min(1),
  next_occurrence_on: z.string().min(1),
  reminder_days: z.coerce.number().refine((v) => [1, 3, 7].includes(v), 'Choose 1, 3, or 7 days'),
  auto_create_transaction: z.boolean(),
  description: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export type RecurringFormPayload = CreateRecurringPayload;

function frequencyToCadence(frequency: FormValues['frequency']): RecurringRule['cadence'] {
  return frequency === 'yearly' ? 'annual' : frequency;
}

function cadenceToFrequency(cadence: RecurringRule['cadence']): FormValues['frequency'] {
  if (cadence === 'annual') return 'yearly';
  if (cadence === 'daily' || cadence === 'weekly' || cadence === 'monthly') return cadence;
  return 'monthly';
}

export function formValuesToPayload(values: FormValues): RecurringFormPayload {
  return {
    name: values.name.trim(),
    transaction_type: values.transaction_type,
    kind: values.kind,
    category_id: values.category_id || null,
    account_id: values.account_id || null,
    amount: values.amount,
    currency: values.currency.toUpperCase(),
    cadence: frequencyToCadence(values.frequency),
    starts_on: values.starts_on,
    next_occurrence_on: values.next_occurrence_on,
    reminder_days: values.reminder_days,
    auto_create_transaction: values.auto_create_transaction,
    description: values.description?.trim() || undefined
  };
}

export function AddRecurringModal({
  open,
  rule,
  accounts,
  categories,
  defaultCurrency,
  onClose,
  onSubmit
}: {
  open: boolean;
  rule: RecurringRule | null;
  accounts: Account[];
  categories: Category[];
  defaultCurrency: string;
  onClose: () => void;
  onSubmit: (values: RecurringFormPayload) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      transaction_type: 'expense',
      kind: 'bill',
      category_id: '',
      account_id: '',
      amount: 0,
      currency: defaultCurrency,
      frequency: 'monthly',
      starts_on: today,
      next_occurrence_on: today,
      reminder_days: 3,
      auto_create_transaction: true,
      description: ''
    }
  });

  useEffect(() => {
    if (!open) return;
    if (rule) {
      const meta = PaymentEngine.getRecurringMeta(rule);
      form.reset({
        name: rule.name,
        transaction_type: rule.transaction_type === 'income' ? 'income' : 'expense',
        kind: meta.kind === 'income' ? 'income' : meta.kind,
        category_id: rule.category_id ?? '',
        account_id: rule.account_id ?? '',
        amount: rule.amount ?? 0,
        currency: rule.currency,
        frequency: cadenceToFrequency(rule.cadence),
        starts_on: rule.starts_on,
        next_occurrence_on: rule.next_occurrence_on ?? rule.starts_on,
        reminder_days: meta.reminder_days,
        auto_create_transaction: meta.auto_create_transaction,
        description: meta.description
      });
    } else {
      form.reset({
        name: '',
        transaction_type: 'expense',
        kind: 'bill',
        category_id: '',
        account_id: '',
        amount: 0,
        currency: defaultCurrency,
        frequency: 'monthly',
        starts_on: today,
        next_occurrence_on: today,
        reminder_days: 3,
        auto_create_transaction: true,
        description: ''
      });
    }
  }, [rule, open, form, defaultCurrency, today]);

  const transactionType = form.watch('transaction_type');

  return (
    <Modal open={open} title={rule ? 'Edit Recurring Payment' : 'Add Recurring Payment'} onClose={onClose}>
      <form
        className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => onSubmit(formValuesToPayload(values)))}
      >
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Name</span>
          <input className="input" {...form.register('name')} />
          {form.formState.errors.name ? <span className="text-xs text-destructive">{form.formState.errors.name.message}</span> : null}
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Type</span>
          <select className="select" {...form.register('transaction_type')}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Kind</span>
          <select className="select" {...form.register('kind')}>
            {transactionType === 'income' ? (
              <>
                <option value="income">Income</option>
                <option value="other">Other</option>
              </>
            ) : (
              <>
                <option value="subscription">Subscription</option>
                <option value="bill">Bill</option>
                <option value="debt">Debt Payment</option>
                <option value="savings">Savings</option>
                <option value="other">Other</option>
              </>
            )}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Category</span>
          <select className="select" {...form.register('category_id')}>
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Account</span>
          <select className="select" {...form.register('account_id')}>
            <option value="">None</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Amount</span>
          <input className="input" type="number" step="0.01" {...form.register('amount')} />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Currency</span>
          <input className="input" maxLength={3} {...form.register('currency')} />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Frequency</span>
          <select className="select" {...form.register('frequency')}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Reminder</span>
          <select className="select" {...form.register('reminder_days', { valueAsNumber: true })}>
            <option value={1}>1 day before</option>
            <option value={3}>3 days before</option>
            <option value={7}>7 days before</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Start date</span>
          <input className="input" type="date" {...form.register('starts_on')} />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Next payment date</span>
          <input className="input" type="date" {...form.register('next_occurrence_on')} />
        </label>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" {...form.register('auto_create_transaction')} />
          <span className="text-sm text-muted">Auto-create transaction when due</span>
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Description (optional)</span>
          <textarea className="input min-h-20" {...form.register('description')} />
        </label>

        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-success text-primary hover:bg-success/90">
            {rule ? 'Save Changes' : 'Add Recurring'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
