-- Finlo financial intelligence release.
-- Extends existing category, savings-goal, account, investment and admin foundations.
-- No duplicate financial source-of-truth tables are introduced.

-- SMART goals reuse public.savings_goals from 0010.
alter table public.savings_goals
  add column if not exists description text,
  add column if not exists goal_type text not null default 'custom',
  add column if not exists priority text not null default 'medium',
  add column if not exists target_date date,
  add column if not exists expected_monthly_contribution numeric(18,2) not null default 0,
  add column if not exists linked_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists linked_investment_id uuid references public.investment_holdings(id) on delete set null,
  add column if not exists auto_contribution boolean not null default false,
  add column if not exists inflation_adjustment_pct numeric(8,4) not null default 0,
  add column if not exists goal_image_path text,
  add column if not exists notes text,
  add column if not exists status text not null default 'active',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_goals_goal_type_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_goal_type_check check (
        goal_type in (
          'emergency_fund', 'vacation', 'house', 'car', 'education',
          'wedding', 'business', 'investment', 'retirement', 'custom'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_goals_priority_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_priority_check
      check (priority in ('low', 'medium', 'high', 'critical'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_goals_status_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_status_check
      check (status in ('draft', 'active', 'paused', 'completed', 'cancelled', 'overdue'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_goals_amounts_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_amounts_check check (
        target_amount >= 0
        and current_amount >= 0
        and expected_monthly_contribution >= 0
        and inflation_adjustment_pct >= 0
      );
  end if;
end;
$$;

create index if not exists savings_goals_household_status_date_idx
on public.savings_goals (household_id, status, target_date)
where deleted_at is null;

alter table public.investment_holdings
  drop constraint if exists investment_holdings_asset_class_check;

alter table public.investment_holdings
  add constraint investment_holdings_asset_class_check check (
    asset_class in (
      'stocks', 'etf', 'mutual_funds', 'bonds', 'crypto', 'gold', 'silver',
      'cash', 'property', 'real_estate', 'vehicle', 'other_assets'
    )
  );

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(18,2) not null,
  contribution_date date not null default current_date,
  source text not null default 'manual',
  account_id uuid references public.accounts(id) on delete set null,
  investment_id uuid references public.investment_holdings(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint goal_contributions_amount_positive check (amount > 0),
  constraint goal_contributions_source_check check (
    source in ('manual', 'automatic', 'account_transfer', 'investment', 'adjustment')
  )
);

create index if not exists goal_contributions_goal_date_idx
on public.goal_contributions (goal_id, contribution_date desc)
where deleted_at is null;

create index if not exists goal_contributions_household_date_idx
on public.goal_contributions (household_id, contribution_date desc)
where deleted_at is null;

alter table public.goal_contributions enable row level security;

drop policy if exists "goal contributions household scoped" on public.goal_contributions;
drop policy if exists "household members read goal contributions" on public.goal_contributions;
create policy "household members read goal contributions"
on public.goal_contributions for select
using ((select public.is_household_member(household_id)));

drop policy if exists "users create own goal contributions" on public.goal_contributions;
create policy "users create own goal contributions"
on public.goal_contributions for insert
with check (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
);

drop policy if exists "users manage own goal contributions" on public.goal_contributions;
create policy "users manage own goal contributions"
on public.goal_contributions for update
using (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
)
with check (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
);

create or replace function public.record_goal_contribution(
  p_goal_id uuid,
  p_amount numeric,
  p_source text default 'manual',
  p_notes text default null,
  p_account_id uuid default null,
  p_investment_id uuid default null,
  p_transaction_id uuid default null
)
returns public.savings_goals
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_goal public.savings_goals;
begin
  if p_amount <= 0 then
    raise exception 'Contribution amount must be positive' using errcode = '22023';
  end if;

  select *
  into v_goal
  from public.savings_goals
  where id = p_goal_id
    and deleted_at is null
  for update;

  if not found or not public.is_household_member(v_goal.household_id) then
    raise exception 'Goal not found or access denied' using errcode = '42501';
  end if;

  insert into public.goal_contributions (
    household_id, user_id, goal_id, amount, contribution_date, source,
    account_id, investment_id, transaction_id, notes
  )
  values (
    v_goal.household_id, auth.uid(), p_goal_id, p_amount, current_date, p_source,
    p_account_id, p_investment_id, p_transaction_id, p_notes
  );

  update public.savings_goals
  set current_amount = least(target_amount, current_amount + p_amount),
      status = case
        when current_amount + p_amount >= target_amount then 'completed'
        else status
      end,
      updated_at = now(),
      version = version + 1
  where id = p_goal_id
  returning * into v_goal;

  return v_goal;
end;
$$;

revoke all on function public.record_goal_contribution(uuid, numeric, text, text, uuid, uuid, uuid) from public;
grant execute on function public.record_goal_contribution(uuid, numeric, text, text, uuid, uuid, uuid) to authenticated;

-- Budget intelligence extends categories rather than creating duplicate budget records.
alter table public.categories
  add column if not exists budget_amount numeric(18,2),
  add column if not exists budget_period text not null default 'monthly',
  add column if not exists budget_start_date date,
  add column if not exists budget_end_date date,
  add column if not exists budget_alerts_enabled boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_budget_period_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_budget_period_check
      check (budget_period in ('monthly', 'quarterly', 'yearly', 'custom'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_budget_amount_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_budget_amount_check
      check (budget_amount is null or budget_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_budget_custom_dates_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_budget_custom_dates_check check (
        budget_period <> 'custom'
        or (
          budget_start_date is not null
          and budget_end_date is not null
          and budget_end_date >= budget_start_date
        )
      );
  end if;
end;
$$;

create index if not exists categories_household_budget_idx
on public.categories (household_id, budget_period)
where deleted_at is null and budget_amount is not null;

create table if not exists public.budget_notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  notification_type text not null,
  threshold_pct numeric(8,2),
  period_start date not null,
  period_end date not null,
  actual_amount numeric(18,2) not null default 0,
  budget_amount numeric(18,2) not null default 0,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint budget_notifications_type_check check (
    notification_type in (
      'threshold_50', 'threshold_75', 'threshold_90', 'threshold_100',
      'exceeded', 'daily_spike', 'unusual_spending',
      'category_overspending', 'nearly_finished', 'reset_reminder'
    )
  )
);

create unique index if not exists budget_notifications_once_idx
on public.budget_notifications (
  household_id, category_id, notification_type, period_start, period_end
);

create index if not exists budget_notifications_household_unread_idx
on public.budget_notifications (household_id, created_at desc)
where is_read = false;

alter table public.budget_notifications enable row level security;

drop policy if exists "budget notifications household scoped" on public.budget_notifications;
drop policy if exists "users read own budget notifications" on public.budget_notifications;
create policy "users read own budget notifications"
on public.budget_notifications for select
using (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
);

drop policy if exists "users create own budget notifications" on public.budget_notifications;
create policy "users create own budget notifications"
on public.budget_notifications for insert
with check (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
);

drop policy if exists "users update own budget notifications" on public.budget_notifications;
create policy "users update own budget notifications"
on public.budget_notifications for update
using (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
)
with check (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
);

-- Unified user-facing notification stream for all financial modules.
create table if not exists public.financial_notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  alert_type text not null,
  severity text not null default 'info',
  title text not null,
  message text not null,
  action_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint financial_notifications_source_check check (
    source_type in ('goal', 'budget', 'debt', 'investment', 'forecast', 'inflation', 'news', 'system')
  ),
  constraint financial_notifications_severity_check check (
    severity in ('info', 'success', 'warning', 'critical')
  )
);

create index if not exists financial_notifications_user_unread_idx
on public.financial_notifications (user_id, created_at desc)
where is_read = false;

create index if not exists financial_notifications_household_created_idx
on public.financial_notifications (household_id, created_at desc);

create unique index if not exists financial_notifications_source_alert_once_idx
on public.financial_notifications (user_id, source_type, source_id, alert_type)
where source_id is not null;

alter table public.financial_notifications enable row level security;

drop policy if exists "financial notifications are private" on public.financial_notifications;
create policy "financial notifications are private"
on public.financial_notifications for all
using (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
)
with check (
  user_id = (select auth.uid())
  and (select public.is_household_member(household_id))
);

-- Feedback and admin feedback management.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null,
  title text not null,
  category text not null,
  description text not null,
  screenshot_path text,
  priority text not null default 'medium',
  email text,
  device_info text,
  browser_info text,
  app_version text,
  status text not null default 'submitted',
  assigned_to uuid references auth.users(id) on delete set null,
  duplicate_of uuid references public.feedback(id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint feedback_rating_check check (rating between 1 and 5),
  constraint feedback_category_check check (
    category in ('feature', 'bug', 'suggestion', 'complaint', 'general')
  ),
  constraint feedback_priority_check check (
    priority in ('low', 'medium', 'high', 'critical')
  ),
  constraint feedback_status_check check (
    status in ('submitted', 'under_review', 'accepted', 'rejected', 'completed', 'duplicate')
  )
);

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at
before update on public.feedback
for each row execute function public.set_updated_at();

create index if not exists feedback_user_created_idx
on public.feedback (user_id, created_at desc);

create index if not exists feedback_admin_queue_idx
on public.feedback (status, priority, created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "users submit feedback" on public.feedback;
create policy "users submit feedback"
on public.feedback for insert
with check (
  user_id = (select auth.uid())
  and (
    household_id is null
    or (select public.is_household_member(household_id))
  )
);

drop policy if exists "users read own feedback" on public.feedback;
create policy "users read own feedback"
on public.feedback for select
using (user_id = (select auth.uid()));

drop policy if exists "admins manage all feedback" on public.feedback;
create policy "admins manage all feedback"
on public.feedback for all
using ((select public.is_app_admin()))
with check ((select public.is_app_admin()));

create table if not exists public.feedback_reply (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists feedback_reply_set_updated_at on public.feedback_reply;
create trigger feedback_reply_set_updated_at
before update on public.feedback_reply
for each row execute function public.set_updated_at();

create index if not exists feedback_reply_feedback_created_idx
on public.feedback_reply (feedback_id, created_at)
where deleted_at is null;

alter table public.feedback_reply enable row level security;

drop policy if exists "users read replies to own feedback" on public.feedback_reply;
create policy "users read replies to own feedback"
on public.feedback_reply for select
using (
  is_internal = false
  and exists (
    select 1
    from public.feedback f
    where f.id = feedback_reply.feedback_id
      and f.user_id = (select auth.uid())
  )
);

drop policy if exists "admins manage feedback replies" on public.feedback_reply;
create policy "admins manage feedback replies"
on public.feedback_reply for all
using ((select public.is_app_admin()))
with check (
  (select public.is_app_admin())
  and author_id = (select auth.uid())
);

drop policy if exists "admins read feedback attachments" on storage.objects;
create policy "admins read feedback attachments"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and (select public.is_app_admin())
);

-- Provider response caches are readable by authenticated clients and writable only
-- by service-role Edge Functions (service role bypasses RLS).
create table if not exists public.market_cache (
  cache_key text primary key,
  provider text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_error text,
  request_count integer not null default 0,
  constraint market_cache_expiry_check check (expires_at >= fetched_at)
);

create index if not exists market_cache_expires_idx
on public.market_cache (expires_at);

alter table public.market_cache enable row level security;

drop policy if exists "authenticated users read market cache" on public.market_cache;
create policy "authenticated users read market cache"
on public.market_cache for select
to authenticated
using (expires_at > now());

create table if not exists public.inflation_cache (
  cache_key text primary key,
  country_code text not null,
  provider text not null,
  current_rate numeric(10,4),
  historical jsonb not null default '[]'::jsonb,
  forecast jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_error text,
  constraint inflation_cache_expiry_check check (expires_at >= fetched_at)
);

create index if not exists inflation_cache_country_expires_idx
on public.inflation_cache (country_code, expires_at desc);

alter table public.inflation_cache enable row level security;

drop policy if exists "authenticated users read inflation cache" on public.inflation_cache;
create policy "authenticated users read inflation cache"
on public.inflation_cache for select
to authenticated
using (expires_at > now());

