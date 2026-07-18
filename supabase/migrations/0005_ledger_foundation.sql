alter table public.accounts
  add column if not exists group_name text not null default 'bank',
  add column if not exists archived_at timestamptz;

alter table public.accounts
  add constraint accounts_group_name_check
  check (group_name in ('bank', 'cash', 'credit_card', 'investment', 'loan', 'wallet'));

alter table public.categories
  add column if not exists parent_id uuid,
  add column if not exists sort_order integer not null default 0;

alter table public.categories
  add constraint categories_parent_fkey foreign key (parent_id) references public.categories(id) on delete set null,
  add constraint categories_not_own_parent check (parent_id is null or parent_id <> id);

create index if not exists categories_parent_id_idx
on public.categories (parent_id)
where parent_id is not null and deleted_at is null;

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  source text not null default 'csv',
  file_name text,
  status text not null default 'pending',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint import_batches_status_check check (status in ('pending', 'imported', 'rolled_back', 'failed')),
  constraint import_batches_version_positive check (version > 0)
);

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer', 'refund', 'adjustment', 'opening_balance'));

alter table public.transactions
  add column if not exists parent_transaction_id uuid,
  add column if not exists split_group_id uuid,
  add column if not exists import_batch_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.transactions
  add constraint transactions_parent_transaction_fkey foreign key (parent_transaction_id) references public.transactions(id) on delete set null,
  add constraint transactions_import_batch_fkey foreign key (import_batch_id) references public.import_batches(id) on delete set null,
  add constraint transactions_not_own_parent check (parent_transaction_id is null or parent_transaction_id <> id);

create index if not exists accounts_group_name_idx
on public.accounts (household_id, group_name)
where deleted_at is null;

create index if not exists import_batches_household_id_idx
on public.import_batches (household_id)
where deleted_at is null;

create index if not exists transactions_parent_transaction_id_idx
on public.transactions (parent_transaction_id)
where parent_transaction_id is not null and deleted_at is null;

create index if not exists transactions_split_group_id_idx
on public.transactions (split_group_id)
where split_group_id is not null and deleted_at is null;

create index if not exists transactions_import_batch_id_idx
on public.transactions (import_batch_id)
where import_batch_id is not null and deleted_at is null;

create trigger import_batches_set_updated_at
before update on public.import_batches
for each row execute function public.set_updated_at();

alter table public.import_batches enable row level security;

create policy "import batches are household scoped"
on public.import_batches for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create or replace function public.create_transfer_transactions(
  p_household_id uuid,
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_date date,
  p_description text default null,
  p_notes text default null,
  p_tags text[] default '{}'::text[]
)
returns table(outgoing_id uuid, incoming_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outgoing_id uuid;
  v_incoming_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'Transfer accounts must be different';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'User is not a member of this household';
  end if;

  if not exists (select 1 from public.accounts where id = p_from_account_id and household_id = p_household_id and deleted_at is null) then
    raise exception 'Source account is invalid';
  end if;

  if not exists (select 1 from public.accounts where id = p_to_account_id and household_id = p_household_id and deleted_at is null) then
    raise exception 'Destination account is invalid';
  end if;

  v_outgoing_id := gen_random_uuid();
  v_incoming_id := gen_random_uuid();

  insert into public.transactions (
    id, household_id, user_id, account_id, amount, type, date, description, notes, tags, transfer_id, metadata
  )
  values (
    v_outgoing_id, p_household_id, p_user_id, p_from_account_id, p_amount, 'transfer', p_date, p_description, p_notes, p_tags, v_incoming_id,
    jsonb_build_object('direction', 'outgoing')
  );

  insert into public.transactions (
    id, household_id, user_id, account_id, amount, type, date, description, notes, tags, transfer_id, metadata
  )
  values (
    v_incoming_id, p_household_id, p_user_id, p_to_account_id, p_amount, 'transfer', p_date, p_description, p_notes, p_tags, v_outgoing_id,
    jsonb_build_object('direction', 'incoming')
  );

  return query select v_outgoing_id, v_incoming_id;
end;
$$;

create or replace function public.rollback_import_batch(p_import_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_count integer;
begin
  select household_id into v_household_id
  from public.import_batches
  where id = p_import_batch_id and deleted_at is null;

  if v_household_id is null then
    raise exception 'Import batch not found';
  end if;

  if not public.is_household_member(v_household_id) then
    raise exception 'User is not a member of this household';
  end if;

  update public.transactions
  set deleted_at = now(), soft_delete = true
  where import_batch_id = p_import_batch_id
    and deleted_at is null;

  get diagnostics v_count = row_count;

  update public.import_batches
  set status = 'rolled_back',
      summary = summary || jsonb_build_object('rolledBackAt', now(), 'rolledBackRows', v_count)
  where id = p_import_batch_id;

  return v_count;
end;
$$;
