import { Link } from 'react-router-dom';
import { Building2, ChevronRight, CreditCard, Landmark, PiggyBank, TrendingUp, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/core/utils/currency';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import { EmptyWidget } from './EmptyWidget';

const TYPE_ICON: Record<string, LucideIcon> = {
  checking: Building2,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
  crypto: TrendingUp,
  loan: Landmark,
  wallet: Wallet,
  cash: Wallet
};

export function AccountsSummary({
  accounts,
  total,
  currency
}: {
  accounts: Array<{ id: string; name: string; institution: string | null | undefined; type: string; balance: number }>;
  total: number;
  currency: string;
}) {
  if (accounts.length === 0) {
    return <EmptyWidget title="No accounts" message="Add your first account to see balances here." ctaLabel="Add account" ctaTo="/accounts" />;
  }

  return (
    <Card className="transition">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Accounts Summary</h2>
          <p className="mt-1 text-xs text-muted">Total {formatCurrency(total, currency)}</p>
        </div>
        <Link to="/accounts" className="text-xs font-medium text-accent hover:underline">
          View all →
        </Link>
      </div>
      <ul className="mt-4 space-y-1">
        {accounts.map((account) => {
          const Icon = TYPE_ICON[account.type] ?? Wallet;
          return (
            <li key={account.id}>
              <Link to="/accounts" className="flex items-center gap-3 rounded-brand px-2 py-2.5 transition hover:bg-primary/50">
                <span className="grid h-9 w-9 place-items-center rounded-brand bg-primary text-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{account.name}</div>
                  <div className="truncate text-xs text-muted">{account.institution || account.type}</div>
                </div>
                <div
                  className={cn(
                    'text-sm font-medium tabular-nums',
                    account.balance < 0 || account.type === 'credit_card' || account.type === 'loan' ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {formatCurrency(account.balance, currency)}
                </div>
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
