insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('attachments', 'attachments', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_household_id(object_name text)
returns uuid
language sql
stable
set search_path = public
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

create or replace function public.storage_user_id(object_name text)
returns uuid
language sql
stable
set search_path = public
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

drop policy if exists "receipts household read" on storage.objects;
drop policy if exists "receipts household write" on storage.objects;
drop policy if exists "attachments household read" on storage.objects;
drop policy if exists "attachments household write" on storage.objects;
drop policy if exists "avatars owner read" on storage.objects;
drop policy if exists "avatars owner write" on storage.objects;

create policy "receipts household read"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and public.is_household_member(public.storage_household_id(name))
);

create policy "receipts household write"
on storage.objects for all
using (
  bucket_id = 'receipts'
  and public.is_household_member(public.storage_household_id(name))
)
with check (
  bucket_id = 'receipts'
  and public.is_household_member(public.storage_household_id(name))
);

create policy "attachments household read"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and public.is_household_member(public.storage_household_id(name))
);

create policy "attachments household write"
on storage.objects for all
using (
  bucket_id = 'attachments'
  and public.is_household_member(public.storage_household_id(name))
)
with check (
  bucket_id = 'attachments'
  and public.is_household_member(public.storage_household_id(name))
);

create policy "avatars owner read"
on storage.objects for select
using (
  bucket_id = 'avatars'
  and public.storage_user_id(name) = auth.uid()
);

create policy "avatars owner write"
on storage.objects for all
using (
  bucket_id = 'avatars'
  and public.storage_user_id(name) = auth.uid()
)
with check (
  bucket_id = 'avatars'
  and public.storage_user_id(name) = auth.uid()
);

with default_categories(name, type, color, icon) as (
  values
    ('Income', 'income', '#22c55e', 'wallet'),
    ('Expense', 'expense', '#ef4444', 'receipt'),
    ('Transfer', 'transfer', '#38bdf8', 'repeat'),
    ('Investment', 'expense', '#a78bfa', 'trending-up'),
    ('Debt', 'expense', '#f97316', 'credit-card'),
    ('Utilities', 'expense', '#eab308', 'bolt'),
    ('Food', 'expense', '#84cc16', 'utensils'),
    ('Transportation', 'expense', '#06b6d4', 'car'),
    ('Housing', 'expense', '#f59e0b', 'home'),
    ('Healthcare', 'expense', '#ec4899', 'heart-pulse'),
    ('Shopping', 'expense', '#8b5cf6', 'shopping-bag'),
    ('Entertainment', 'expense', '#14b8a6', 'ticket')
)
insert into public.categories (household_id, user_id, name, type, color, icon, metadata)
select h.id, h.owner_id, dc.name, dc.type, dc.color, dc.icon, jsonb_build_object('seeded', true, 'seed_version', 1)
from public.households h
cross join default_categories dc
where h.deleted_at is null
on conflict (household_id, name, type) do nothing;

create or replace function public.seed_default_categories_for_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (household_id, user_id, name, type, color, icon, metadata)
  values
    (new.id, new.owner_id, 'Income', 'income', '#22c55e', 'wallet', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Expense', 'expense', '#ef4444', 'receipt', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Transfer', 'transfer', '#38bdf8', 'repeat', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Investment', 'expense', '#a78bfa', 'trending-up', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Debt', 'expense', '#f97316', 'credit-card', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Utilities', 'expense', '#eab308', 'bolt', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Food', 'expense', '#84cc16', 'utensils', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Transportation', 'expense', '#06b6d4', 'car', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Housing', 'expense', '#f59e0b', 'home', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Healthcare', 'expense', '#ec4899', 'heart-pulse', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Shopping', 'expense', '#8b5cf6', 'shopping-bag', '{"seeded": true, "seed_version": 1}'::jsonb),
    (new.id, new.owner_id, 'Entertainment', 'expense', '#14b8a6', 'ticket', '{"seeded": true, "seed_version": 1}'::jsonb)
  on conflict (household_id, name, type) do nothing;

  return new;
end;
$$;

create trigger households_seed_default_categories
after insert on public.households
for each row execute function public.seed_default_categories_for_household();
