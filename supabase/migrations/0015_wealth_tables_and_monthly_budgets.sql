-- Normalized wealth tables + month-based budgets.
-- Complements investment_holdings and debts without removing them.

-- ---------------------------------------------------------------------------
-- Portfolio investments (stocks, ETF, mutual funds, bonds, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_type text not null default 'other',
  name text not null,
  ticker text,
  quantity numeric(18,6) not null default 0,
  purchase_price numeric(18,4) not null default 0,
  current_price numeric(18,4) not null default 0,
  currency text not null default 'USD',
  sector text,
  exchange text,
  purchase_date date,
  linked_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint investments_type_check check (
    investment_type in (
      'stocks', 'etf', 'mutual_funds', 'bonds', 'gold_etf', 'reit', 'other'
    )
  )
);

create index if not exists investments_household_active_idx
on public.investments (household_id, investment_type)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Physical / non-market assets
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null default 'other',
  name text not null,
  estimated_value numeric(18,2) not null default 0,
  currency text not null default 'USD',
  acquisition_date date,
  depreciation_pct numeric(8,4) not null default 0,
  linked_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint assets_type_check check (
    asset_type in (
      'property', 'vehicle', 'cash', 'gold', 'silver', 'jewelry',
      'business', 'collectibles', 'electronics', 'other'
    )
  )
);

create index if not exists assets_household_active_idx
on public.assets (household_id, asset_type)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Crypto holdings
-- ---------------------------------------------------------------------------
create table if not exists public.crypto_assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  coin_name text not null,
  ticker text not null,
  quantity numeric(24,8) not null default 0,
  purchase_price numeric(18,4) not null default 0,
  current_price numeric(18,4) not null default 0,
  currency text not null default 'USD',
  exchange text,
  wallet text,
  linked_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

create index if not exists crypto_assets_household_active_idx
on public.crypto_assets (household_id, ticker)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Loans (liabilities)
-- ---------------------------------------------------------------------------
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_type text not null default 'personal',
  name text not null,
  lender text,
  original_amount numeric(18,2) not null default 0,
  remaining_balance numeric(18,2) not null default 0,
  interest_rate_pct numeric(8,4) not null default 0,
  monthly_emi numeric(18,2) not null default 0,
  term_months integer,
  start_date date,
  maturity_date date,
  linked_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint loans_type_check check (
    loan_type in (
      'home', 'education', 'personal', 'vehicle', 'business', 'other'
    )
  )
);

create index if not exists loans_household_active_idx
on public.loans (household_id, loan_type)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Credit cards
-- ---------------------------------------------------------------------------
create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_name text not null,
  bank text,
  credit_limit numeric(18,2) not null default 0,
  outstanding_balance numeric(18,2) not null default 0,
  apr_pct numeric(8,4) not null default 0,
  due_date date,
  minimum_payment numeric(18,2) not null default 0,
  reward_type text,
  linked_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

create index if not exists credit_cards_household_active_idx
on public.credit_cards (household_id)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Month-based budgets
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null,
  budget_year integer not null,
  budget_month integer not null check (budget_month between 0 and 11),
  allocated numeric(18,2) not null default 0,
  spent numeric(18,2) not null default 0,
  remaining numeric(18,2) not null default 0,
  forecast numeric(18,2) not null default 0,
  carry_forward numeric(18,2) not null default 0,
  status text not null default 'active',
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint monthly_budgets_status_check check (
    status in ('active', 'archived', 'draft')
  ),
  constraint monthly_budgets_unique_month_category unique (
    household_id, budget_year, budget_month, category_name
  )
);

create index if not exists monthly_budgets_household_period_idx
on public.monthly_budgets (household_id, budget_year, budget_month, status)
where deleted_at is null;

-- updated_at triggers
drop trigger if exists investments_set_updated_at on public.investments;
create trigger investments_set_updated_at before update on public.investments
for each row execute function public.set_updated_at();

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at before update on public.assets
for each row execute function public.set_updated_at();

drop trigger if exists crypto_assets_set_updated_at on public.crypto_assets;
create trigger crypto_assets_set_updated_at before update on public.crypto_assets
for each row execute function public.set_updated_at();

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists credit_cards_set_updated_at on public.credit_cards;
create trigger credit_cards_set_updated_at before update on public.credit_cards
for each row execute function public.set_updated_at();

drop trigger if exists monthly_budgets_set_updated_at on public.monthly_budgets;
create trigger monthly_budgets_set_updated_at before update on public.monthly_budgets
for each row execute function public.set_updated_at();

-- RLS
alter table public.investments enable row level security;
alter table public.assets enable row level security;
alter table public.crypto_assets enable row level security;
alter table public.loans enable row level security;
alter table public.credit_cards enable row level security;
alter table public.monthly_budgets enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'investments', 'assets', 'crypto_assets', 'loans', 'credit_cards', 'monthly_budgets'
  ] loop
    execute format('drop policy if exists "household members read %1$s" on public.%1$I', tbl);
    execute format(
      'create policy "household members read %1$s" on public.%1$I for select using ((select public.is_household_member(household_id)))',
      tbl
    );
    execute format('drop policy if exists "household members manage %1$s" on public.%1$I', tbl);
    execute format(
      'create policy "household members manage %1$s" on public.%1$I for all using ((select public.is_household_member(household_id))) with check ((select public.is_household_member(household_id)))',
      tbl
    );
  end loop;
end;
$$;

-- Seed investments from legacy investment_holdings when empty.
insert into public.investments (
  household_id, user_id, investment_type, name, ticker, quantity,
  purchase_price, current_price, currency, notes, metadata
)
select
  ih.household_id,
  ih.user_id,
  case ih.asset_class
    when 'stocks' then 'stocks'
    when 'etf' then 'etf'
    when 'mutual_funds' then 'mutual_funds'
    when 'bonds' then 'bonds'
    when 'gold' then 'gold_etf'
    when 'property' then 'reit'
    else 'other'
  end,
  ih.name,
  ih.ticker,
  ih.quantity,
  ih.average_cost,
  coalesce(nullif(ih.current_price, 0), ih.average_cost),
  ih.currency,
  ih.notes,
  ih.metadata
from public.investment_holdings ih
where ih.deleted_at is null
  and not exists (
    select 1 from public.investments inv
    where inv.household_id = ih.household_id
      and inv.ticker is not distinct from ih.ticker
      and inv.name = ih.name
      and inv.deleted_at is null
  );

-- Dashboard aggregate RPC (single round-trip for wealth center).
create or replace function public.get_wealth_dashboard_summary(p_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not (select public.is_household_member(p_household_id)) then
    raise exception 'Unauthorized household access' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'investments', coalesce((
      select jsonb_agg(row_to_json(i))
      from (
        select id, investment_type, name, ticker, quantity, purchase_price, current_price, currency
        from public.investments
        where household_id = p_household_id and deleted_at is null
      ) i
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(row_to_json(a))
      from (
        select id, asset_type, name, estimated_value, currency
        from public.assets
        where household_id = p_household_id and deleted_at is null
      ) a
    ), '[]'::jsonb),
    'crypto', coalesce((
      select jsonb_agg(row_to_json(c))
      from (
        select id, coin_name, ticker, quantity, purchase_price, current_price, currency
        from public.crypto_assets
        where household_id = p_household_id and deleted_at is null
      ) c
    ), '[]'::jsonb),
    'loans', coalesce((
      select jsonb_agg(row_to_json(l))
      from (
        select id, loan_type, name, remaining_balance, interest_rate_pct, monthly_emi
        from public.loans
        where household_id = p_household_id and deleted_at is null
      ) l
    ), '[]'::jsonb),
    'credit_cards', coalesce((
      select jsonb_agg(row_to_json(cc))
      from (
        select id, card_name, bank, credit_limit, outstanding_balance, apr_pct, due_date
        from public.credit_cards
        where household_id = p_household_id and deleted_at is null
      ) cc
    ), '[]'::jsonb),
    'monthly_budgets', coalesce((
      select jsonb_agg(row_to_json(mb))
      from (
        select id, category_name, budget_year, budget_month, allocated, spent, remaining, forecast, carry_forward, status
        from public.monthly_budgets
        where household_id = p_household_id and deleted_at is null and status = 'active'
      ) mb
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_wealth_dashboard_summary(uuid) to authenticated;
