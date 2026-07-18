create schema if not exists tests;

create or replace function tests.assert_finlo_phase2_security_foundation()
returns void
language plpgsql
security definer
set search_path = public, tests
as $$
declare
  household_a uuid;
  household_b uuid;
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  account_a uuid;
  category_b uuid;
begin
  insert into auth.users (id, email)
  values
    (owner_a, 'phase2-owner-a@example.test'),
    (owner_b, 'phase2-owner-b@example.test')
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, currency, country)
  values
    (owner_a, 'Phase 2 Owner A', 'USD', 'US'),
    (owner_b, 'Phase 2 Owner B', 'USD', 'US')
  on conflict (id) do nothing;

  select household_id into household_a
  from public.household_members
  where user_id = owner_a and deleted_at is null
  limit 1;

  select household_id into household_b
  from public.household_members
  where user_id = owner_b and deleted_at is null
  limit 1;

  if household_a is null or household_b is null or household_a = household_b then
    raise exception 'Expected each user to have a separate default household';
  end if;

  insert into public.accounts (household_id, user_id, name, type, currency)
  values (household_a, owner_a, 'Owner A Checking', 'checking', 'USD')
  returning id into account_a;

  select id into category_b
  from public.categories
  where household_id = household_b
  limit 1;

  begin
    insert into public.transactions (household_id, user_id, account_id, category_id, amount, type, date)
    values (household_a, owner_a, account_a, category_b, 10, 'expense', current_date);

    raise exception 'Expected cross-household category reference to fail';
  exception
    when foreign_key_violation then
      null;
  end;

  begin
    insert into public.household_members (household_id, user_id, role)
    values (household_a, owner_a, 'member');

    raise exception 'Expected duplicate household membership to fail';
  exception
    when unique_violation then
      null;
  end;

  begin
    insert into public.transactions (household_id, user_id, account_id, amount, type, date, transfer_id)
    values (household_a, owner_a, account_a, 10, 'expense', current_date, gen_random_uuid());

    raise exception 'Expected invalid transfer reference to fail';
  exception
    when foreign_key_violation then
      null;
  end;
end;
$$;
