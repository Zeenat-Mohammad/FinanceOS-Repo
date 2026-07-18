-- Insights module: investments, receipt OCR, and country preference helpers.

alter table public.profiles
  add column if not exists insights_country text;

comment on column public.profiles.insights_country is 'ISO country code used by Insights (economy, tax, news). Falls back to profiles.country.';

-- Portfolio holdings
create table if not exists public.investment_holdings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_class text not null default 'stocks',
  ticker text,
  name text not null,
  quantity numeric(18,8) not null default 0,
  average_cost numeric(18,6) not null default 0,
  current_price numeric(18,6),
  currency text not null default 'USD',
  logo_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint investment_holdings_asset_class_check check (
    asset_class in ('stocks', 'etf', 'mutual_funds', 'gold', 'crypto', 'cash', 'property', 'vehicle')
  ),
  constraint investment_holdings_quantity_non_negative check (quantity >= 0),
  constraint investment_holdings_version_positive check (version > 0)
);

create index if not exists investment_holdings_household_idx
on public.investment_holdings (household_id)
where deleted_at is null;

create trigger investment_holdings_set_updated_at
before update on public.investment_holdings
for each row execute function public.set_updated_at();

alter table public.investment_holdings enable row level security;

drop policy if exists "investment holdings are household scoped" on public.investment_holdings;
create policy "investment holdings are household scoped"
on public.investment_holdings for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

-- Investment ledger lines (buys/sells/dividends)
create table if not exists public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  holding_id uuid references public.investment_holdings(id) on delete set null,
  type text not null default 'buy',
  quantity numeric(18,8),
  price numeric(18,6),
  amount numeric(18,2) not null default 0,
  currency text not null default 'USD',
  traded_on date not null default current_date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint investment_transactions_type_check check (
    type in ('buy', 'sell', 'dividend', 'deposit', 'withdraw', 'fee', 'adjustment')
  )
);

create index if not exists investment_transactions_holding_idx
on public.investment_transactions (holding_id)
where deleted_at is null;

alter table public.investment_transactions enable row level security;

drop policy if exists "investment transactions are household scoped" on public.investment_transactions;
create policy "investment transactions are household scoped"
on public.investment_transactions for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

-- Receipt OCR archive (searchable)
create table if not exists public.receipt_images (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  image_url text not null,
  storage_path text,
  ocr_text text,
  merchant text,
  invoice_number text,
  tax_amount numeric(14,2),
  amount numeric(14,2),
  currency text,
  receipt_date date,
  payment_method text,
  items jsonb not null default '[]'::jsonb,
  confidence numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists receipt_images_household_idx
on public.receipt_images (household_id)
where deleted_at is null;

create index if not exists receipt_images_merchant_idx
on public.receipt_images (household_id, merchant)
where deleted_at is null;

create index if not exists receipt_images_invoice_idx
on public.receipt_images (household_id, invoice_number)
where deleted_at is null;

create index if not exists receipt_images_search_idx
on public.receipt_images using gin (
  to_tsvector('simple', coalesce(merchant, '') || ' ' || coalesce(invoice_number, '') || ' ' || coalesce(ocr_text, ''))
);

alter table public.receipt_images enable row level security;

drop policy if exists "receipt images are household scoped" on public.receipt_images;
create policy "receipt images are household scoped"
on public.receipt_images for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

-- Ensure receipts bucket exists (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
