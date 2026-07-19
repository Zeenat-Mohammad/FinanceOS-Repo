import { Link } from 'react-router-dom';
import {
  Bitcoin,
  Building2,
  CreditCard,
  Landmark,
  TrendingUp
} from 'lucide-react';
import type {
  AssetRecord,
  CreditCardRecord,
  CryptoAssetRecord,
  InvestmentRecord,
  LoanRecord
} from '@/types/wealth';
import { formatCurrency } from '@/core/utils/currency';
import { WealthDataTable, cnPositive, formatPct } from '@/features/networth/components/WealthDataTable';

const INVESTMENT_GROUPS: Array<{ label: string; types: InvestmentRecord['investment_type'][] }> = [
  { label: 'Stocks', types: ['stocks'] },
  { label: 'ETF', types: ['etf'] },
  { label: 'Mutual Funds', types: ['mutual_funds'] },
  { label: 'Bonds', types: ['bonds'] },
  { label: 'Gold ETF', types: ['gold_etf'] },
  { label: 'REIT', types: ['reit'] }
];

const ASSET_GROUPS: Array<{ label: string; types: AssetRecord['asset_type'][] }> = [
  { label: 'Property', types: ['property'] },
  { label: 'Vehicle', types: ['vehicle'] },
  { label: 'Gold', types: ['gold'] },
  { label: 'Silver', types: ['silver'] },
  { label: 'Jewelry', types: ['jewelry'] },
  { label: 'Business', types: ['business'] },
  { label: 'Cash Assets', types: ['cash'] },
  { label: 'Other Assets', types: ['other', 'collectibles', 'electronics'] }
];

export function InvestmentAccountsSection({
  investments,
  currency
}: {
  investments: InvestmentRecord[];
  currency: string;
}) {
  const total = investments.reduce((sum, row) => sum + row.quantity * row.current_price, 0);
  const groups = INVESTMENT_GROUPS.map((group) => ({
    label: group.label,
    rows: investments.filter((row) => group.types.includes(row.investment_type))
  }));

  return (
    <div className="space-y-3">
      <SectionHeader icon={TrendingUp} title="Investments" count={investments.length} total={formatCurrency(total, currency)} href="/net-worth?tab=investments" />
      {groups.map((group) => (
        <WealthDataTable
          key={group.label}
          title={group.label}
          icon={TrendingUp}
          rows={group.rows}
          totalValue={formatCurrency(group.rows.reduce((s, r) => s + r.quantity * r.current_price, 0), currency)}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'ticker', label: 'Ticker' },
            { key: 'quantity', label: 'Qty' },
            {
              key: 'current_price',
              label: 'Value',
              render: (row) => formatCurrency(row.quantity * row.current_price, row.currency || currency)
            }
          ]}
          defaultOpen={group.rows.length > 0 && group.rows.length <= 6}
        />
      ))}
    </div>
  );
}

export function CryptoAccountsSection({ crypto, currency }: { crypto: CryptoAssetRecord[]; currency: string }) {
  const total = crypto.reduce((sum, row) => sum + row.quantity * row.current_price, 0);
  return (
    <div className="space-y-3">
      <SectionHeader icon={Bitcoin} title="Crypto" count={crypto.length} total={formatCurrency(total, currency)} href="/net-worth?tab=crypto" />
      <WealthDataTable
        title="Coins"
        icon={Bitcoin}
        rows={crypto}
        totalValue={formatCurrency(total, currency)}
        columns={[
          { key: 'coin_name', label: 'Coin' },
          { key: 'ticker', label: 'Ticker' },
          { key: 'quantity', label: 'Quantity' },
          {
            key: 'gain',
            label: 'Gain/Loss',
            render: (row) => {
              const cost = row.quantity * row.purchase_price;
              const value = row.quantity * row.current_price;
              const pct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
              return <span className={cnPositive(value - cost)}>{formatPct(pct)}</span>;
            }
          },
          {
            key: 'value',
            label: 'Current Value',
            render: (row) => formatCurrency(row.quantity * row.current_price, row.currency || currency)
          }
        ]}
      />
    </div>
  );
}

export function CreditCardAccountsSection({ cards, currency }: { cards: CreditCardRecord[]; currency: string }) {
  const total = cards.reduce((sum, row) => sum + row.outstanding_balance, 0);
  return (
    <div className="space-y-3">
      <SectionHeader icon={CreditCard} title="Credit Cards" count={cards.length} total={formatCurrency(total, currency)} href="/net-worth?tab=credit-cards" />
      <WealthDataTable
        title="Credit Cards"
        icon={CreditCard}
        rows={cards}
        totalValue={formatCurrency(total, currency)}
        columns={[
          { key: 'card_name', label: 'Card' },
          { key: 'outstanding_balance', label: 'Outstanding', render: (row) => formatCurrency(row.outstanding_balance, currency) },
          { key: 'credit_limit', label: 'Credit Limit', render: (row) => formatCurrency(row.credit_limit, currency) },
          {
            key: 'available',
            label: 'Available Credit',
            render: (row) => formatCurrency(Math.max(0, row.credit_limit - row.outstanding_balance), currency)
          },
          { key: 'due_date', label: 'Due Date', render: (row) => row.due_date ?? '—' }
        ]}
      />
    </div>
  );
}

export function LoanAccountsSection({ loans, currency }: { loans: LoanRecord[]; currency: string }) {
  const total = loans.reduce((sum, row) => sum + row.remaining_balance, 0);
  const groups = [
    { label: 'Mortgage', types: ['home'] as LoanRecord['loan_type'][] },
    { label: 'Education', types: ['education'] as LoanRecord['loan_type'][] },
    { label: 'Vehicle', types: ['vehicle'] as LoanRecord['loan_type'][] },
    { label: 'Personal', types: ['personal'] as LoanRecord['loan_type'][] },
    { label: 'Business', types: ['business'] as LoanRecord['loan_type'][] }
  ].map((group) => ({ ...group, rows: loans.filter((row) => group.types.includes(row.loan_type)) }));

  return (
    <div className="space-y-3">
      <SectionHeader icon={Landmark} title="Loans" count={loans.length} total={formatCurrency(total, currency)} href="/net-worth?tab=loans" />
      {groups.map((group) => (
        <WealthDataTable
          key={group.label}
          title={group.label}
          icon={Landmark}
          rows={group.rows}
          columns={[
            { key: 'name', label: 'Loan Name' },
            { key: 'remaining_balance', label: 'Remaining', render: (row) => formatCurrency(row.remaining_balance, currency) },
            { key: 'monthly_emi', label: 'Monthly EMI', render: (row) => formatCurrency(row.monthly_emi, currency) },
            { key: 'interest_rate_pct', label: 'Interest', render: (row) => `${row.interest_rate_pct}%` },
            { key: 'maturity_date', label: 'Payoff Date', render: (row) => row.maturity_date ?? '—' }
          ]}
          defaultOpen={group.rows.length > 0 && group.rows.length <= 4}
        />
      ))}
    </div>
  );
}

export function AssetAccountsSection({ assets, currency }: { assets: AssetRecord[]; currency: string }) {
  const total = assets.reduce((sum, row) => sum + row.estimated_value, 0);
  const groups = ASSET_GROUPS.map((group) => ({
    label: group.label,
    rows: assets.filter((row) => group.types.includes(row.asset_type))
  }));

  return (
    <div className="space-y-3">
      <SectionHeader icon={Building2} title="Assets" count={assets.length} total={formatCurrency(total, currency)} href="/net-worth?tab=assets" />
      {groups.map((group) => (
        <WealthDataTable
          key={group.label}
          title={group.label}
          icon={Building2}
          rows={group.rows}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'asset_type', label: 'Type' },
            { key: 'estimated_value', label: 'Value', render: (row) => formatCurrency(row.estimated_value, row.currency || currency) }
          ]}
          defaultOpen={group.rows.length > 0 && group.rows.length <= 4}
        />
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  total,
  href
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  total: string;
  href: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted">
            {count} records · {total}
          </p>
        </div>
      </div>
      <Link to={href} className="text-xs text-accent hover:underline">
        Manage in Wealth Center →
      </Link>
    </div>
  );
}
