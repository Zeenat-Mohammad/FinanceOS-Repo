-- Recurring payment instances for calendar + dashboard tracking.
-- Recurring templates continue to live in public.recurring_rules.

create table if not exists public.recurring_payment_instances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recurring_rule_id uuid not null references public.recurring_rules(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  scheduled_date date not null,
  paid_date date,
  status text not null default 'pending',
  amount numeric not null default 0,
  currency text not null default 'USD',
  name text not null,
  transaction_type text not null default 'expense',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint recurring_payment_instances_status_check
    check (status in ('pending', 'paid', 'skipped', 'overdue')),
  constraint recurring_payment_instances_type_check
    check (transaction_type in ('income', 'expense', 'transfer')),
  constraint recurring_payment_instances_version_positive check (version > 0),
  constraint recurring_payment_instances_unique_occurrence
    unique (recurring_rule_id, scheduled_date)
);

create index if not exists recurring_payment_instances_household_date_idx
on public.recurring_payment_instances (household_id, scheduled_date)
where deleted_at is null;

create index if not exists recurring_payment_instances_rule_idx
on public.recurring_payment_instances (recurring_rule_id)
where deleted_at is null;

create index if not exists recurring_payment_instances_status_idx
on public.recurring_payment_instances (household_id, status)
where deleted_at is null;

create trigger recurring_payment_instances_set_updated_at
before update on public.recurring_payment_instances
for each row execute function public.set_updated_at();

alter table public.recurring_payment_instances enable row level security;

create policy "recurring payment instances are household scoped"
on public.recurring_payment_instances for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
