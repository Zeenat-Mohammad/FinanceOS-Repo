import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountsRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { Button, Card, LoadingState, Page, PageHeader, Table } from '@/shared/components';
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
