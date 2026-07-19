import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountsRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { Button, Card, LoadingState, Modal, Page, PageHeader } from '@/shared/components';
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

export default function AccountsPage() {
  const { user, household, loading } = useLedgerContext();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const currency = household?.default_currency ?? 'USD';

  const accountsQuery = useQuery({ queryKey: queryKeys.accounts.all, queryFn: AccountsRepository.list, staleTime: 60_000 });
  const wealthQuery = useWealthSummary(household?.id);

  const summary = useAccountsSummary(accountsQuery.data ?? [], wealthQuery.data, currency);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency, type: 'checking', group_name: 'bank', opening_balance: 0 }
  });

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
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
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
        currency={currency}
        onAdd={() => setAddOpen(true)}
        onEdit={editAccount}
        onArchive={(id) => void AccountsRepository.archive(id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }))}
        onDelete={(id) => void AccountsRepository.remove(id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }))}
      />

      <section className="space-y-8" aria-label="Investment accounts">
        <Card className="border-dashed bg-primary/10 p-4 text-sm text-muted">
          Wealth records below come from normalized tables (<code className="text-foreground">investments</code>,{' '}
          <code className="text-foreground">assets</code>, <code className="text-foreground">crypto_assets</code>,{' '}
          <code className="text-foreground">loans</code>, <code className="text-foreground">credit_cards</code>). Manage them in{' '}
          <a href="/net-worth" className="text-accent hover:underline">
            Investments & Net Worth
          </a>
          .
        </Card>
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
    </Page>
  );
}
