-- Net Worth Center + Savings Center foundations

-- Asset catalog
create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, code)
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_code text not null,
  name text not null,
  value numeric(18,2) not null default 0,
  currency text not null default 'USD',
  linked_account_id uuid references public.accounts(id) on delete set null,
  linked_holding_id uuid,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists assets_household_idx on public.assets (household_id) where deleted_at is null;

create trigger assets_set_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

create table if not exists public.asset_valuations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  valued_on date not null default current_date,
  value numeric(18,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists asset_valuations_asset_idx on public.asset_valuations (asset_id, valued_on desc);

-- Liability catalog
create table if not exists public.liability_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, code)
);

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_code text not null,
  name text not null,
  balance numeric(18,2) not null default 0,
  currency text not null default 'USD',
  apr_percent numeric(8,4),
  linked_debt_id text,
  linked_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists liabilities_household_idx on public.liabilities (household_id) where deleted_at is null;

create trigger liabilities_set_updated_at
before update on public.liabilities
for each row execute function public.set_updated_at();

-- Monthly net worth snapshots
create table if not exists public.networth_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  snapshot_month date not null,
  net_worth numeric(18,2) not null default 0,
  total_assets numeric(18,2) not null default 0,
  total_liabilities numeric(18,2) not null default 0,
  growth_pct numeric(10,4),
  savings_rate_pct numeric(10,4),
  investment_gain numeric(18,2),
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (household_id, snapshot_month)
);

create index if not exists networth_snapshots_household_idx
on public.networth_snapshots (household_id, snapshot_month desc);

-- Savings challenges
create table if not exists public.savings_challenges (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  average_cost numeric(14,2) not null default 0,
  frequency text not null default 'daily',
  target_days integer not null default 30,
  expected_savings numeric(14,2),
  start_date date not null default current_date,
  end_date date,
  difficulty text not null default 'medium',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint savings_challenges_frequency_check check (frequency in ('daily', 'weekly', 'monthly')),
  constraint savings_challenges_difficulty_check check (difficulty in ('easy', 'medium', 'hard')),
  constraint savings_challenges_status_check check (status in ('active', 'paused', 'completed', 'archived'))
);

create index if not exists savings_challenges_household_idx
on public.savings_challenges (household_id) where deleted_at is null;

create trigger savings_challenges_set_updated_at
before update on public.savings_challenges
for each row execute function public.set_updated_at();

create table if not exists public.savings_challenge_days (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.savings_challenges(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  day date not null,
  success boolean not null default true,
  amount_saved numeric(14,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (challenge_id, day)
);

create index if not exists savings_challenge_days_challenge_idx
on public.savings_challenge_days (challenge_id, day desc);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Primary savings goal',
  target_amount numeric(18,2) not null default 0,
  current_amount numeric(18,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

-- RLS
alter table public.asset_categories enable row level security;
alter table public.assets enable row level security;
alter table public.asset_valuations enable row level security;
alter table public.liability_categories enable row level security;
alter table public.liabilities enable row level security;
alter table public.networth_snapshots enable row level security;
alter table public.savings_challenges enable row level security;
alter table public.savings_challenge_days enable row level security;
alter table public.savings_goals enable row level security;

drop policy if exists "asset categories household scoped" on public.asset_categories;
create policy "asset categories household scoped" on public.asset_categories for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "assets household scoped" on public.assets;
create policy "assets household scoped" on public.assets for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "asset valuations household scoped" on public.asset_valuations;
create policy "asset valuations household scoped" on public.asset_valuations for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "liability categories household scoped" on public.liability_categories;
create policy "liability categories household scoped" on public.liability_categories for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "liabilities household scoped" on public.liabilities;
create policy "liabilities household scoped" on public.liabilities for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "networth snapshots household scoped" on public.networth_snapshots;
create policy "networth snapshots household scoped" on public.networth_snapshots for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "savings challenges household scoped" on public.savings_challenges;
create policy "savings challenges household scoped" on public.savings_challenges for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "savings challenge days household scoped" on public.savings_challenge_days;
create policy "savings challenge days household scoped" on public.savings_challenge_days for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "savings goals household scoped" on public.savings_goals;
create policy "savings goals household scoped" on public.savings_goals for all
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
