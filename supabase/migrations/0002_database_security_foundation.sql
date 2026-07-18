create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  owner_id uuid not null references auth.users(id) on delete cascade,
  default_currency text not null default 'USD',
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint households_version_positive check (version > 0)
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint household_members_role_check check (role in ('owner', 'admin', 'member', 'viewer')),
  constraint household_members_version_positive check (version > 0),
  constraint household_members_unique_active_user unique (household_id, user_id)
);

create unique index household_members_one_owner_household_idx
on public.household_members (household_id)
where role = 'owner' and deleted_at is null;

create index households_owner_id_idx on public.households (owner_id);
create index household_members_household_id_idx on public.household_members (household_id) where deleted_at is null;
create index household_members_user_id_idx on public.household_members (user_id) where deleted_at is null;

create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_updated_at();

create trigger household_members_set_updated_at
before update on public.household_members
for each row execute function public.set_updated_at();

alter table public.profiles
  add column if not exists locale text not null default 'en-US',
  add column if not exists timezone text not null default 'UTC',
  add column if not exists salary_frequency text,
  add column if not exists family_size integer,
  add column if not exists tax_preferences jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step text,
  add column if not exists deleted_at timestamptz,
  add column if not exists version integer not null default 1;

alter table public.profiles
  add constraint profiles_salary_frequency_check
  check (salary_frequency is null or salary_frequency in ('weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual', 'irregular')),
  add constraint profiles_family_size_check
  check (family_size is null or family_size > 0),
  add constraint profiles_version_positive
  check (version > 0);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

insert into public.households (owner_id, name, default_currency, locale, timezone)
select p.id, coalesce(nullif(p.full_name, '') || '''s Household', 'My Household'), p.currency, p.locale, p.timezone
from public.profiles p
where not exists (
  select 1
  from public.household_members hm
  where hm.user_id = p.id and hm.deleted_at is null
);

insert into public.household_members (household_id, user_id, role)
select h.id, h.owner_id, 'owner'
from public.households h
where not exists (
  select 1
  from public.household_members hm
  where hm.household_id = h.id and hm.user_id = h.owner_id
);

with financial_users as (
  select user_id from public.accounts
  union
  select user_id from public.categories
  union
  select user_id from public.transactions
)
insert into public.households (owner_id, name)
select fu.user_id, 'My Household'
from financial_users fu
where not exists (
  select 1
  from public.household_members hm
  where hm.user_id = fu.user_id and hm.deleted_at is null
);

insert into public.household_members (household_id, user_id, role)
select h.id, h.owner_id, 'owner'
from public.households h
where not exists (
  select 1
  from public.household_members hm
  where hm.household_id = h.id and hm.user_id = h.owner_id
);

create or replace function public.create_default_household_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  if exists (
    select 1 from public.household_members
    where user_id = new.id and deleted_at is null
  ) then
    return new;
  end if;

  insert into public.households (owner_id, name, default_currency, locale, timezone)
  values (
    new.id,
    coalesce(nullif(new.full_name, '') || '''s Household', 'My Household'),
    new.currency,
    new.locale,
    new.timezone
  )
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$$;

create trigger profiles_create_default_household
after insert on public.profiles
for each row execute function public.create_default_household_for_profile();

alter table public.accounts
  add column if not exists household_id uuid,
  add column if not exists opening_balance numeric(14,2) not null default 0,
  add column if not exists opening_balance_date date,
  add column if not exists account_subtype text,
  add column if not exists credit_limit numeric(14,2),
  add column if not exists is_archived boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists version integer not null default 1;

update public.accounts a
set household_id = hm.household_id
from public.household_members hm
where a.household_id is null
  and hm.user_id = a.user_id
  and hm.deleted_at is null;

alter table public.accounts
  alter column household_id set not null,
  add constraint accounts_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade,
  add constraint accounts_credit_limit_non_negative check (credit_limit is null or credit_limit >= 0),
  add constraint accounts_opening_balance_date_required check (opening_balance = 0 or opening_balance_date is not null),
  add constraint accounts_version_positive check (version > 0),
  add constraint accounts_id_household_unique unique (id, household_id);

create index accounts_household_id_idx on public.accounts (household_id) where deleted_at is null;
create index accounts_household_archived_idx on public.accounts (household_id, is_archived) where deleted_at is null;

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

alter table public.categories
  add column if not exists household_id uuid,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists version integer not null default 1,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.categories c
set household_id = hm.household_id
from public.household_members hm
where c.household_id is null
  and hm.user_id = c.user_id
  and hm.deleted_at is null;

alter table public.categories
  alter column household_id set not null,
  add constraint categories_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade,
  add constraint categories_version_positive check (version > 0),
  add constraint categories_id_household_unique unique (id, household_id),
  add constraint categories_household_name_type_unique unique (household_id, name, type);

create index categories_household_id_idx on public.categories (household_id) where deleted_at is null;
create index categories_household_type_idx on public.categories (household_id, type) where deleted_at is null;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

alter table public.transactions
  add column if not exists household_id uuid,
  add column if not exists status text not null default 'posted',
  add column if not exists merchant text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists attachment_url text,
  add column if not exists transfer_id uuid,
  add column if not exists import_hash text,
  add column if not exists import_source text,
  add column if not exists external_reference text,
  add column if not exists soft_delete boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists version integer not null default 1;

update public.transactions t
set household_id = a.household_id
from public.accounts a
where t.household_id is null
  and t.account_id = a.id;

alter table public.transactions
  alter column household_id set not null,
  add constraint transactions_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade,
  add constraint transactions_account_household_fkey foreign key (account_id, household_id) references public.accounts(id, household_id) on delete cascade,
  add constraint transactions_category_household_fkey foreign key (category_id, household_id) references public.categories(id, household_id),
  add constraint transactions_transfer_id_fkey foreign key (transfer_id) references public.transactions(id) on delete set null,
  add constraint transactions_status_check check (status in ('expected', 'pending', 'posted', 'reconciled', 'void')),
  add constraint transactions_not_self_transfer check (transfer_id is null or transfer_id <> id),
  add constraint transactions_soft_delete_consistency check ((soft_delete = false and deleted_at is null) or soft_delete = true),
  add constraint transactions_version_positive check (version > 0),
  add constraint transactions_id_household_unique unique (id, household_id);

create unique index transactions_import_hash_source_idx
on public.transactions (household_id, import_source, import_hash)
where import_hash is not null and import_source is not null;

create index transactions_household_id_idx on public.transactions (household_id) where deleted_at is null;
create index transactions_household_date_idx on public.transactions (household_id, date desc) where deleted_at is null;
create index transactions_account_id_idx on public.transactions (account_id) where deleted_at is null;
create index transactions_category_id_idx on public.transactions (category_id) where category_id is not null and deleted_at is null;
create index transactions_status_idx on public.transactions (household_id, status) where deleted_at is null;
create index transactions_transfer_id_idx on public.transactions (transfer_id) where transfer_id is not null;

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.validate_transaction_household_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  linked_transfer_household uuid;
begin
  if new.transfer_id is not null then
    select household_id into linked_transfer_household
    from public.transactions
    where id = new.transfer_id;

    if linked_transfer_household is null or linked_transfer_household <> new.household_id then
      raise exception 'Transfer reference must belong to the same household';
    end if;

    if new.type <> 'transfer' then
      raise exception 'Only transfer transactions may reference transfer_id';
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_validate_household_links
before insert or update on public.transactions
for each row execute function public.validate_transaction_household_links();

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id),
  category_id uuid references public.categories(id),
  name text not null,
  transaction_type text not null,
  amount numeric(14,2),
  currency text not null default 'USD',
  cadence text not null,
  interval_count integer not null default 1,
  day_of_month integer,
  day_of_week integer,
  starts_on date not null,
  ends_on date,
  next_occurrence_on date,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint recurring_rules_transaction_type_check check (transaction_type in ('income', 'expense', 'transfer')),
  constraint recurring_rules_cadence_check check (cadence in ('daily', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual', 'custom')),
  constraint recurring_rules_status_check check (status in ('active', 'paused', 'ended')),
  constraint recurring_rules_interval_positive check (interval_count > 0),
  constraint recurring_rules_day_of_month_check check (day_of_month is null or day_of_month between 1 and 31),
  constraint recurring_rules_day_of_week_check check (day_of_week is null or day_of_week between 0 and 6),
  constraint recurring_rules_version_positive check (version > 0),
  constraint recurring_rules_account_household_fkey foreign key (account_id, household_id) references public.accounts(id, household_id),
  constraint recurring_rules_category_household_fkey foreign key (category_id, household_id) references public.categories(id, household_id),
  constraint recurring_rules_id_household_unique unique (id, household_id)
);

create table public.expected_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recurring_rule_id uuid references public.recurring_rules(id),
  account_id uuid references public.accounts(id),
  category_id uuid references public.categories(id),
  transaction_id uuid references public.transactions(id),
  name text not null,
  transaction_type text not null,
  expected_amount numeric(14,2) not null,
  currency text not null default 'USD',
  expected_date date not null,
  status text not null default 'scheduled',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint expected_transactions_transaction_type_check check (transaction_type in ('income', 'expense', 'transfer')),
  constraint expected_transactions_status_check check (status in ('scheduled', 'matched', 'skipped', 'cancelled')),
  constraint expected_transactions_amount_non_negative check (expected_amount >= 0),
  constraint expected_transactions_version_positive check (version > 0),
  constraint expected_transactions_rule_household_fkey foreign key (recurring_rule_id, household_id) references public.recurring_rules(id, household_id),
  constraint expected_transactions_account_household_fkey foreign key (account_id, household_id) references public.accounts(id, household_id),
  constraint expected_transactions_category_household_fkey foreign key (category_id, household_id) references public.categories(id, household_id),
  constraint expected_transactions_transaction_household_fkey foreign key (transaction_id, household_id) references public.transactions(id, household_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recurring_rule_id uuid references public.recurring_rules(id),
  name text not null,
  vendor text,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  renewal_date date,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint subscriptions_status_check check (status in ('active', 'paused', 'cancelled')),
  constraint subscriptions_amount_non_negative check (amount >= 0),
  constraint subscriptions_version_positive check (version > 0),
  constraint subscriptions_rule_household_fkey foreign key (recurring_rule_id, household_id) references public.recurring_rules(id, household_id)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recurring_rule_id uuid references public.recurring_rules(id),
  account_id uuid references public.accounts(id),
  category_id uuid references public.categories(id),
  name text not null,
  biller text,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  due_day integer,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint bills_status_check check (status in ('active', 'paused', 'ended')),
  constraint bills_amount_non_negative check (amount >= 0),
  constraint bills_due_day_check check (due_day is null or due_day between 1 and 31),
  constraint bills_version_positive check (version > 0),
  constraint bills_rule_household_fkey foreign key (recurring_rule_id, household_id) references public.recurring_rules(id, household_id),
  constraint bills_account_household_fkey foreign key (account_id, household_id) references public.accounts(id, household_id),
  constraint bills_category_household_fkey foreign key (category_id, household_id) references public.categories(id, household_id)
);

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recurring_rule_id uuid references public.recurring_rules(id),
  account_id uuid references public.accounts(id),
  category_id uuid references public.categories(id),
  name text not null,
  payer text,
  amount numeric(14,2),
  currency text not null default 'USD',
  frequency text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint income_sources_frequency_check check (frequency in ('weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual', 'irregular')),
  constraint income_sources_status_check check (status in ('active', 'paused', 'ended')),
  constraint income_sources_amount_non_negative check (amount is null or amount >= 0),
  constraint income_sources_version_positive check (version > 0),
  constraint income_sources_rule_household_fkey foreign key (recurring_rule_id, household_id) references public.recurring_rules(id, household_id),
  constraint income_sources_account_household_fkey foreign key (account_id, household_id) references public.accounts(id, household_id),
  constraint income_sources_category_household_fkey foreign key (category_id, household_id) references public.categories(id, household_id)
);

create index recurring_rules_household_id_idx on public.recurring_rules (household_id) where deleted_at is null;
create index recurring_rules_account_id_idx on public.recurring_rules (account_id) where account_id is not null and deleted_at is null;
create index recurring_rules_category_id_idx on public.recurring_rules (category_id) where category_id is not null and deleted_at is null;
create index recurring_rules_recurrence_idx on public.recurring_rules (household_id, status, next_occurrence_on) where deleted_at is null;

create index expected_transactions_household_id_idx on public.expected_transactions (household_id) where deleted_at is null;
create index expected_transactions_account_id_idx on public.expected_transactions (account_id) where account_id is not null and deleted_at is null;
create index expected_transactions_category_id_idx on public.expected_transactions (category_id) where category_id is not null and deleted_at is null;
create index expected_transactions_date_status_idx on public.expected_transactions (household_id, expected_date, status) where deleted_at is null;
create index expected_transactions_recurrence_idx on public.expected_transactions (recurring_rule_id, expected_date) where recurring_rule_id is not null and deleted_at is null;

create index subscriptions_household_id_idx on public.subscriptions (household_id) where deleted_at is null;
create index subscriptions_recurrence_idx on public.subscriptions (recurring_rule_id) where recurring_rule_id is not null and deleted_at is null;
create index subscriptions_status_idx on public.subscriptions (household_id, status) where deleted_at is null;

create index bills_household_id_idx on public.bills (household_id) where deleted_at is null;
create index bills_account_id_idx on public.bills (account_id) where account_id is not null and deleted_at is null;
create index bills_category_id_idx on public.bills (category_id) where category_id is not null and deleted_at is null;
create index bills_recurrence_idx on public.bills (recurring_rule_id) where recurring_rule_id is not null and deleted_at is null;
create index bills_status_idx on public.bills (household_id, status) where deleted_at is null;

create index income_sources_household_id_idx on public.income_sources (household_id) where deleted_at is null;
create index income_sources_account_id_idx on public.income_sources (account_id) where account_id is not null and deleted_at is null;
create index income_sources_category_id_idx on public.income_sources (category_id) where category_id is not null and deleted_at is null;
create index income_sources_recurrence_idx on public.income_sources (recurring_rule_id) where recurring_rule_id is not null and deleted_at is null;
create index income_sources_status_idx on public.income_sources (household_id, status) where deleted_at is null;

create trigger recurring_rules_set_updated_at
before update on public.recurring_rules
for each row execute function public.set_updated_at();

create trigger expected_transactions_set_updated_at
before update on public.expected_transactions
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger bills_set_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

create trigger income_sources_set_updated_at
before update on public.income_sources
for each row execute function public.set_updated_at();

create or replace function public.current_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.household_id
  from public.household_members hm
  where hm.user_id = auth.uid()
    and hm.deleted_at is null;
$$;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.deleted_at is null
  );
$$;

create or replace function public.can_access_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.household_members own_membership
      join public.household_members target_membership
        on target_membership.household_id = own_membership.household_id
      where own_membership.user_id = auth.uid()
        and target_membership.user_id = target_user_id
        and own_membership.deleted_at is null
        and target_membership.deleted_at is null
    );
$$;

create or replace function public.can_manage_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.role in ('owner', 'admin')
      and hm.deleted_at is null
  );
$$;

drop policy if exists "profiles are private" on public.profiles;
drop policy if exists "accounts are private" on public.accounts;
drop policy if exists "categories are private" on public.categories;
drop policy if exists "transactions are private" on public.transactions;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.expected_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.bills enable row level security;
alter table public.income_sources enable row level security;

create policy "households are visible to members"
on public.households for select
using (public.is_household_member(id));

create policy "household owners can update households"
on public.households for update
using (public.can_manage_household(id))
with check (public.can_manage_household(id));

create policy "household members are visible to household"
on public.household_members for select
using (public.is_household_member(household_id));

create policy "household owners manage memberships"
on public.household_members for all
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "profiles visible inside household"
on public.profiles for select
using (public.can_access_profile(id));

create policy "users update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "users insert own profile"
on public.profiles for insert
with check (id = auth.uid());

create policy "accounts are household scoped"
on public.accounts for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "categories are household scoped"
on public.categories for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "transactions are household scoped"
on public.transactions for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "recurring rules are household scoped"
on public.recurring_rules for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "expected transactions are household scoped"
on public.expected_transactions for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "subscriptions are household scoped"
on public.subscriptions for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "bills are household scoped"
on public.bills for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "income sources are household scoped"
on public.income_sources for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
