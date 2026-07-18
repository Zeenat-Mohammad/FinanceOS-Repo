import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountsRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { Button, Card, LoadingState, Page, PageHeader, Table } from '@/shared/components';
import { formatCurrency } from '@/core/utils/currency';
import { PiggyBank, TrendingUp } from 'lucide-react';
import { useLedgerContext } from './useLedgerContext';

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'wallet', 'cash', 'credit_card', 'investment', 'crypto', 'loan']),
  group_name: z.enum(['bank', 'cash', 'credit_card', 'investment', 'loan', 'wallet']),
  institution: z.string().optional(),
  opening_balance: z.coerce.number(),
  currency: z.string().min(3).max(3)
});

type FormValues = z.infer<typeof schema>;

export default function AccountsPage() {
  const { user, household, loading } = useLedgerContext();
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({ queryKey: queryKeys.accounts.all, queryFn: AccountsRepository.list });
  const investmentAccounts = useMemo(
    () =>
      (accountsQuery.data ?? []).filter(
        (account) => !account.deleted_at && !account.is_archived && (account.group_name === 'investment' || account.type === 'investment' || account.type === 'crypto')
      ),
    [accountsQuery.data]
  );
  const investmentTotal = investmentAccounts.reduce((sum, account) => sum + Number(account.opening_balance || account.balance || 0), 0);
  const investmentCurrency = investmentAccounts[0]?.currency ?? household?.default_currency ?? 'USD';
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currency: 'USD', type: 'checking', group_name: 'bank', opening_balance: 0 } });
  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      AccountsRepository.create({
        ...values,
        household_id: household!.id,
        user_id: user!.id,
        institution: values.institution || null
      }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    }
  });

  if (loading || accountsQuery.isLoading) return <LoadingState label="Loading accounts" />;

  async function editAccount(accountId: string, currentName: string) {
    const name = window.prompt('Account name', currentName);
    if (!name) return;
    await AccountsRepository.update(accountId, { name });
    await queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
  }

  return (
    <Page>
      <PageHeader title="Accounts" description="Create, edit, archive, and delete ledger accounts. Balances are derived from transactions only." />
      <Card>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <input className="input" placeholder="Name" {...form.register('name')} />
          <select className="select" {...form.register('type')}>
            {['checking', 'savings', 'wallet', 'cash', 'credit_card', 'investment', 'crypto', 'loan'].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select className="select" {...form.register('group_name')}>
            {['bank', 'cash', 'credit_card', 'investment', 'loan', 'wallet'].map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
          <input className="input" placeholder="Institution" {...form.register('institution')} />
          <input className="input" placeholder="Opening balance" type="number" {...form.register('opening_balance')} />
          <input className="input" placeholder="Currency" {...form.register('currency')} />
          <Button className="sm:col-span-3" type="submit" disabled={!household || createMutation.isPending}>
            Create Account
          </Button>
        </form>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]" aria-label="Investment accounts">
        <Card className="overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Investment Section</p>
              <h2 className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(investmentTotal, investmentCurrency)}</h2>
              <p className="mt-1 text-sm text-muted">Derived from investment and crypto accounts.</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-success" style={{ width: `${investmentAccounts.length ? 72 : 0}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted">
            Add account type <span className="font-medium text-foreground">investment</span> or <span className="font-medium text-foreground">crypto</span> to populate this section.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Investment Accounts</h2>
            <PiggyBank className="h-4 w-4 text-success" aria-hidden />
          </div>
          {investmentAccounts.length === 0 ? (
            <div className="rounded-brand border border-dashed border-border p-5 text-sm text-muted">
              No investment accounts yet. Create an Investment or Crypto account to start tracking this sleeve.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {investmentAccounts.map((account) => (
                <div key={account.id} className="rounded-brand border border-border/70 bg-primary/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{account.name}</p>
                      <p className="mt-1 text-xs text-muted">{account.institution || account.type}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(account.opening_balance || account.balance || 0, account.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Table>
        <thead>
          <tr className="text-left text-muted">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Group</th>
            <th className="px-3 py-2">Institution</th>
            <th className="px-3 py-2">Opening</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(accountsQuery.data ?? []).map((account) => (
            <tr key={account.id}>
              <td className="px-3 py-2">{account.name}</td>
              <td className="px-3 py-2">{account.group_name}</td>
              <td className="px-3 py-2">{account.institution}</td>
              <td className="px-3 py-2">{account.opening_balance} {account.currency}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => editAccount(account.id, account.name)}>
                    Edit
                  </Button>
                  <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => AccountsRepository.archive(account.id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }))}>
                    Archive
                  </Button>
                  <Button className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => AccountsRepository.remove(account.id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }))}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Page>
  );
}
