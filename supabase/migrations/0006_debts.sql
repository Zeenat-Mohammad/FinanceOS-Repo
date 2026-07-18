-- Debt Center foundation (future first-class table).
-- Active persistence currently uses households.metadata.debtCenter via DebtsRepository.
-- This migration enables a dedicated table when the team is ready to migrate.

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'other',
  balance_minor bigint not null default 0,
  original_balance_minor bigint not null default 0,
  apr_percent numeric(8,4) not null default 0,
  minimum_payment_minor bigint not null default 0,
  monthly_payment_minor bigint not null default 0,
  due_day integer,
  extra_payment_allowed boolean not null default true,
  lender text,
  linked_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  custom_order integer not null default 0,
  status text not null default 'active',
  paid_off_at timestamptz,
  total_interest_paid_minor bigint,
  months_taken integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint debts_type_check check (type in ('credit_card', 'personal_loan', 'car_loan', 'mortgage', 'student_loan', 'other')),
  constraint debts_status_check check (status in ('active', 'paid_off', 'archived')),
  constraint debts_balance_non_negative check (balance_minor >= 0),
  constraint debts_version_positive check (version > 0)
);

create index if not exists debts_household_id_idx
on public.debts (household_id)
where deleted_at is null;

create index if not exists debts_status_idx
on public.debts (household_id, status)
where deleted_at is null;

create trigger debts_set_updated_at
before update on public.debts
for each row execute function public.set_updated_at();

alter table public.debts enable row level security;

create policy "debts are household scoped"
on public.debts for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
