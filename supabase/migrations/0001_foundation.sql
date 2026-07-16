create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'USD',
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'wallet', 'cash', 'credit_card', 'investment', 'crypto', 'loan')),
  balance numeric(14,2) not null default 0,
  institution text,
  currency text not null default 'USD',
  color text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  color text,
  icon text,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  type text not null check (type in ('income', 'expense', 'transfer')),
  date date not null default current_date,
  description text,
  notes text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_date_idx on public.transactions (account_id, date desc);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "profiles are private" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "accounts are private" on public.accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories are private" on public.categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions are private" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
