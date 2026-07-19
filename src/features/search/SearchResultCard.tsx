import {
  Banknote,
  ChartPie,
  CreditCard,
  FileText,
  FolderTree,
  Landmark,
  ReceiptText,
  Target,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { formatCurrency } from '@/core/utils/currency';
import type { SearchResultItem, SearchSection } from '@/core/search/types';
import { cn } from '@/core/utils/cn';

const ICONS: Record<SearchSection, typeof Wallet> = {
  transactions: ReceiptText,
  categories: FolderTree,
  accounts: Wallet,
  goals: Target,
  budgets: ChartPie,
  debts: CreditCard,
  investments: TrendingUp,
  assets: Landmark,
  crypto: TrendingUp,
  loans: Landmark,
  credit_cards: CreditCard,
  reports: FileText
};

export function SearchResultCard({
  item,
  active,
  currency,
  onSelect
}: {
  item: SearchResultItem;
  active?: boolean;
  currency: string;
  onSelect: () => void;
}) {
  const Icon = ICONS[item.section] ?? Banknote;

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-secondary/50',
        active && 'bg-accent/10 ring-1 ring-accent/30'
      )}
      onClick={onSelect}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/30 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--color-card-foreground)]">{item.title}</span>
        <span className="block truncate text-xs text-[var(--color-card-muted)]">{item.subtitle}</span>
      </span>
      <span className="shrink-0 text-right text-xs text-[var(--color-card-muted)]">
        {typeof item.amount === 'number' ? formatCurrency(item.amount, currency) : null}
        {item.date ? <span className="block">{new Date(item.date).toLocaleDateString()}</span> : null}
      </span>
    </button>
  );
}
