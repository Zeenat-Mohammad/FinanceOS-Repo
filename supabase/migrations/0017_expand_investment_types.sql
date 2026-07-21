-- Expand the normalized investments catalog used by Accounts and Wealth Center.
-- Values such as current value remain derived from quantity * current_price.

alter table public.investments
  drop constraint if exists investments_type_check;

alter table public.investments
  add constraint investments_type_check check (
    investment_type in (
      'stocks',
      'etf',
      'mutual_funds',
      'crypto',
      'gold',
      'real_estate',
      'bonds',
      'fixed_deposits',
      'retirement',
      'cash_equivalent',
      'gold_etf',
      'reit',
      'other'
    )
  );

