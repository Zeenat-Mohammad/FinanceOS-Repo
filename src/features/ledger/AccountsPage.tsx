import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountsRepository, WealthRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { invalidateWealthDependents } from '@/data/invalidateFinancialData';
import { Button, LoadingState, Modal, Page, PageHeader, toast } from '@/shared/components';
import { useWealthSummary } from '@/features/networth/useWealth';
import { useLedgerContext } from './useLedgerContext';
import { AccountsSummaryCards } from './accounts/AccountsSummaryCards';
import { BankAccountsSection } from './accounts/BankAccountsSection';
import { useAccountsSummary } from './accounts/useAccountsSummary';
import {
  AssetAccountsSection,
  CreditCardAccountsSection,
  CryptoAccountsSection,
  InvestmentAccountsSection,
  LoanAccountsSection
} from './accounts/WealthAccountSections';

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'wallet', 'cash']),
  group_name: z.enum(['bank', 'cash', 'wallet']),
  institution: z.string().optional(),
  opening_balance: z.coerce.number(),
  currency: z.string().min(3).max(3)
});

type FormValues = z.infer<typeof schema>;

const investmentSchema = z.object({
  name: z.string().trim().min(1, 'Investment name is required'),
  investment_type: z.enum(['stocks', 'etf', 'mutual_funds', 'crypto', 'gold', 'real_estate', 'bonds', 'fixed_deposits', 'retirement', 'cash_equivalent', 'other']),
  linked_account_id: z.string().optional(),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  purchase_price: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  current_price: z.coerce.number().min(0, 'Current price cannot be negative'),
  currency: z.string().trim().length(3, 'Use a three-letter currency code'),
  broker: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(['active', 'archived'])
});

type InvestmentFormValues = z.infer<typeof investmentSchema>;

export default function AccountsPage() {
  const { user, household, loading } = useLedgerContext();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const currency = household?.default_currency ?? 'USD';

  const accountsQuery = useQuery({ queryKey: queryKeys.accounts.all, queryFn: AccountsRepository.list, staleTime: 60_000 });
  const wealthQuery = useWealthSummary(household?.id);

  const summary = useAccountsSummary(accountsQuery.data ?? [], wealthQuery.data, currency);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency, type: 'checking', group_name: 'bank', opening_balance: 0 }
  });

  const investmentForm = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      investment_type: 'stocks',
      purchase_date: new Date().toISOString().slice(0, 10),
      quantity: 1,
      purchase_price: 0,
      current_price: 0,
      currency,
      status: 'active',
      tags: ''
    }
  });
  const investmentQuantity = investmentForm.watch('quantity') || 0;
  const investmentCurrentPrice = investmentForm.watch('current_price') || 0;

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      AccountsRepository.create({
        ...values,
        household_id: household!.id,
        user_id: user!.id,
        institution: values.institution || null
      }),
    onSuccess: () => {
      form.reset({ currency, type: 'checking', group_name: 'bank', opening_balance: 0 });
      setAddOpen(false);
      void invalidateWealthDependents(queryClient);
    }
  });

  const createInvestmentMutation = useMutation({
    mutationFn: (values: InvestmentFormValues) =>
      WealthRepository.createInvestment({
        ...values,
        household_id: household!.id,
        user_id: user!.id,
        linked_account_id: values.linked_account_id || null,
        broker: values.broker || null,
        notes: values.notes || null,
        tags: values.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? []
      }),
    onSuccess: async () => {
      investmentForm.reset({
        investment_type: 'stocks',
        purchase_date: new Date().toISOString().slice(0, 10),
        quantity: 1,
        purchase_price: 0,
        current_price: 0,
        currency,
        status: 'active',
        tags: ''
      });
      setInvestmentOpen(false);
      await invalidateWealthDependents(queryClient);
      toast('Investment added', { description: 'All portfolio and financial summaries are refreshing.', variant: 'success' });
    },
    onError: (error) => {
      console.error('[Accounts] Failed to create investment', error);
      toast('Investment was not saved', { description: error instanceof Error ? error.message : 'Please try again.', variant: 'error' });
    }
  });

  const wealth = useMemo(() => wealthQuery.data ?? { investments: [], assets: [], crypto: [], loans: [], credit_cards: [], monthly_budgets: [] }, [wealthQuery.data]);

  if (loading || accountsQuery.isLoading) return <LoadingState label="Loading accounts" />;

  async function editAccount(accountId: string, currentName: string) {
    const name = window.prompt('Account name', currentName);
    if (!name) return;
    await AccountsRepository.update(accountId, { name });
    await queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
  }

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Bank accounts for daily cash flow. Investments, assets, crypto, loans, and credit cards are tracked in the Wealth Center."
      />

      <AccountsSummaryCards
        currency={currency}
        totalCash={summary.totalCash}
        investmentTotal={summary.investmentTotal}
        assetValue={summary.assetValue}
        loanBalance={summary.loanBalance}
        creditOutstanding={summary.creditOutstanding}
        netWorth={summary.netWorth}
      />

      <BankAccountsSection
        accounts={summary.bankAccounts}
        archivedAccounts={summary.archivedBankAccounts}
        currency={currency}
        onAdd={() => setAddOpen(true)}
        onAddInvestment={() => setInvestmentOpen(true)}
        onEdit={editAccount}
        onArchive={(id) => {
          const account = summary.allBankAccounts.find((row) => row.id === id);
          const request = account?.is_archived ? AccountsRepository.restore(id) : AccountsRepository.archive(id);
          void request.then(() => invalidateWealthDependents(queryClient));
        }}
        onDelete={(id) => {
          if (!window.confirm('Delete this account? This removes it from active financial summaries.')) return;
          void AccountsRepository.remove(id).then(() => invalidateWealthDependents(queryClient));
        }}
      />

      <section className="space-y-8" aria-label="Investment accounts">
        <InvestmentAccountsSection investments={wealth.investments} currency={currency} />
        <CryptoAccountsSection crypto={wealth.crypto} currency={currency} />
        <CreditCardAccountsSection cards={wealth.credit_cards} currency={currency} />
        <LoanAccountsSection loans={wealth.loans} currency={currency} />
        <AssetAccountsSection assets={wealth.assets} currency={currency} />
      </section>

      <Modal open={addOpen} title="Add bank account" onClose={() => setAddOpen(false)}>
        <form className="grid gap-3" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <input className="input" placeholder="Account name" {...form.register('name')} />
          <select className="select" {...form.register('type')}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="wallet">Cash Wallet</option>
            <option value="cash">Cash</option>
          </select>
          <select className="select" {...form.register('group_name')}>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
          </select>
          <input className="input" placeholder="Institution" {...form.register('institution')} />
          <input className="input" placeholder="Opening balance" type="number" step="0.01" {...form.register('opening_balance')} />
          <input className="input" placeholder="Currency" {...form.register('currency')} />
          <Button type="submit" disabled={!household || createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create Account'}
          </Button>
        </form>
      </Modal>

      <Modal open={investmentOpen} title="Add investment" onClose={() => setInvestmentOpen(false)}>
        <form className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2" onSubmit={investmentForm.handleSubmit((values) => createInvestmentMutation.mutate(values))}>
          <Field label="Investment Name" error={investmentForm.formState.errors.name?.message} className="sm:col-span-2">
            <input className="input" {...investmentForm.register('name')} />
          </Field>
          <Field label="Type" error={investmentForm.formState.errors.investment_type?.message}>
            <select className="select" {...investmentForm.register('investment_type')}>
              {INVESTMENT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Linked Account (optional)">
            <select className="select" {...investmentForm.register('linked_account_id')}>
              <option value="">No linked account</option>
              {summary.bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </Field>
          <Field label="Purchase Date" error={investmentForm.formState.errors.purchase_date?.message}>
            <input className="input" type="date" {...investmentForm.register('purchase_date')} />
          </Field>
          <Field label="Quantity" error={investmentForm.formState.errors.quantity?.message}>
            <input className="input" type="number" min="0" step="any" {...investmentForm.register('quantity')} />
          </Field>
          <Field label="Purchase Price" error={investmentForm.formState.errors.purchase_price?.message}>
            <input className="input" type="number" min="0" step="0.01" {...investmentForm.register('purchase_price')} />
          </Field>
          <Field label="Current Price" error={investmentForm.formState.errors.current_price?.message}>
            <input className="input" type="number" min="0" step="0.01" {...investmentForm.register('current_price')} />
          </Field>
          <Field label="Current Value">
            <output className="input block bg-surface-muted font-semibold tabular-nums" aria-live="polite">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency: investmentForm.watch('currency') || currency }).format(investmentQuantity * investmentCurrentPrice)}
            </output>
          </Field>
          <Field label="Currency" error={investmentForm.formState.errors.currency?.message}>
            <input className="input uppercase" maxLength={3} {...investmentForm.register('currency')} />
          </Field>
          <Field label="Broker">
            <input className="input" {...investmentForm.register('broker')} />
          </Field>
          <Field label="Status">
            <select className="select" {...investmentForm.register('status')}><option value="active">Active</option><option value="archived">Archived</option></select>
          </Field>
          <Field label="Tags" className="sm:col-span-2">
            <input className="input" placeholder="retirement, long-term" {...investmentForm.register('tags')} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea className="input min-h-24 resize-y" {...investmentForm.register('notes')} />
          </Field>
          <Button className="sm:col-span-2" type="submit" disabled={!household || createInvestmentMutation.isPending}>
            {createInvestmentMutation.isPending ? 'Saving…' : 'Add Investment'}
          </Button>
        </form>
      </Modal>
    </Page>
  );
}

const INVESTMENT_TYPES: Array<{ value: InvestmentFormValues['investment_type']; label: string }> = [
  { value: 'stocks', label: 'Stocks' }, { value: 'etf', label: 'ETFs' },
  { value: 'mutual_funds', label: 'Mutual Funds' }, { value: 'crypto', label: 'Crypto' },
  { value: 'gold', label: 'Gold' }, { value: 'real_estate', label: 'Real Estate' },
  { value: 'bonds', label: 'Bonds' }, { value: 'fixed_deposits', label: 'Fixed Deposits' },
  { value: 'retirement', label: 'Retirement' }, { value: 'cash_equivalent', label: 'Cash Equivalent' },
  { value: 'other', label: 'Other' }
];

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}{error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}</label>;
}
