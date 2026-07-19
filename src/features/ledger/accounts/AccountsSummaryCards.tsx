import { Landmark, TrendingUp, Wallet, WalletCards } from 'lucide-react';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';

export function AccountsSummaryCards({
  currency,
  totalCash,
  investmentTotal,
  assetValue,
  loanBalance,
  creditOutstanding,
  netWorth
}: {
  currency: string;
  totalCash: number;
  investmentTotal: number;
  assetValue: number;
  loanBalance: number;
  creditOutstanding: number;
  netWorth: number;
}) {
  const cards = [
    { label: 'Total Cash', value: totalCash, icon: Wallet, tone: 'teal' as const },
    { label: 'Investment Value', value: investmentTotal, icon: TrendingUp, tone: 'purple' as const },
    { label: 'Asset Value', value: assetValue, icon: Landmark, tone: 'green' as const },
    { label: 'Loan Balance', value: loanBalance, icon: Landmark, tone: 'red' as const },
    { label: 'Credit Card Outstanding', value: creditOutstanding, icon: WalletCards, tone: 'red' as const },
    { label: 'Net Worth', value: netWorth, icon: WalletCards, tone: 'accent' as const }
  ];

  return (
    <section className="sticky top-14 z-20 -mx-1 grid gap-3 bg-background/95 pb-1 pt-1 backdrop-blur sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <article key={card.label} className="card-shell p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{card.label}</p>
              <p className={cn('mt-1 text-lg font-semibold tabular-nums', card.tone === 'red' && 'text-red-400')}>
                {formatCurrency(card.value, currency)}
              </p>
            </div>
            <card.icon className="h-4 w-4 shrink-0 text-accent" />
          </div>
        </article>
      ))}
    </section>
  );
}
