-- Reminder scheduling foundation for recurring transactions and calendar reminders.
-- This migration is idempotent and preserves the existing auth/admin permission model.

alter table public.recurring_rules
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_date date,
  add column if not exists reminder_time time not null default '09:00',
  add column if not exists reminder_email text,
  add column if not exists reminder_status text not null default 'idle',
  add column if not exists reminder_next_send_at timestamptz,
  add column if not exists reminder_last_sent_at timestamptz,
  add column if not exists reminder_failure_count integer not null default 0,
  add column if not exists reminder_last_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recurring_rules_reminder_status_check'
      and conrelid = 'public.recurring_rules'::regclass
  ) then
    alter table public.recurring_rules
      add constraint recurring_rules_reminder_status_check
      check (reminder_status in ('idle', 'scheduled', 'sent', 'failed', 'disabled'));
  end if;
end;
$$;

create index if not exists recurring_rules_reminder_schedule_idx
on public.recurring_rules (household_id, reminder_enabled, reminder_next_send_at)
where deleted_at is null;

create table if not exists public.calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  caption text,
  reminder_date date not null,
  reminder_time time not null default '09:00',
  reminder_email text,
  reminder_enabled boolean not null default true,
  status text not null default 'scheduled',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint calendar_reminders_status_check check (status in ('scheduled', 'sent', 'failed', 'cancelled')),
  constraint calendar_reminders_version_positive check (version > 0)
);

create index if not exists calendar_reminders_household_date_idx
on public.calendar_reminders (household_id, reminder_date, reminder_time)
where deleted_at is null;

create index if not exists calendar_reminders_user_date_idx
on public.calendar_reminders (user_id, reminder_date)
where deleted_at is null;

create index if not exists calendar_reminders_status_idx
on public.calendar_reminders (status, reminder_date, reminder_time)
where deleted_at is null and reminder_enabled = true;

drop trigger if exists calendar_reminders_set_updated_at on public.calendar_reminders;
create trigger calendar_reminders_set_updated_at
before update on public.calendar_reminders
for each row execute function public.set_updated_at();

alter table public.calendar_reminders enable row level security;

drop policy if exists "calendar reminders household scoped" on public.calendar_reminders;
create policy "calendar reminders household scoped"
on public.calendar_reminders for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create table if not exists public.reminder_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  reminder_kind text not null,
  calendar_reminder_id uuid references public.calendar_reminders(id) on delete cascade,
  recurring_rule_id uuid references public.recurring_rules(id) on delete cascade,
  scheduled_for timestamptz not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint reminder_email_deliveries_kind_check check (reminder_kind in ('calendar', 'recurring')),
  constraint reminder_email_deliveries_status_check check (status in ('pending', 'sent', 'failed', 'cancelled')),
  constraint reminder_email_deliveries_source_check check (
    (calendar_reminder_id is not null and recurring_rule_id is null and reminder_kind = 'calendar')
    or
    (calendar_reminder_id is null and recurring_rule_id is not null and reminder_kind = 'recurring')
  ),
  constraint reminder_email_deliveries_attempt_count_check check (attempt_count >= 0),
  constraint reminder_email_deliveries_version_positive check (version > 0)
);

create index if not exists reminder_email_deliveries_due_idx
on public.reminder_email_deliveries (status, scheduled_for, attempt_count)
where deleted_at is null;

create index if not exists reminder_email_deliveries_household_idx
on public.reminder_email_deliveries (household_id, scheduled_for desc)
where deleted_at is null;

create unique index if not exists reminder_email_deliveries_calendar_once_idx
on public.reminder_email_deliveries (calendar_reminder_id, scheduled_for)
where deleted_at is null and calendar_reminder_id is not null;

create unique index if not exists reminder_email_deliveries_recurring_once_idx
on public.reminder_email_deliveries (recurring_rule_id, scheduled_for)
where deleted_at is null and recurring_rule_id is not null;

drop trigger if exists reminder_email_deliveries_set_updated_at on public.reminder_email_deliveries;
create trigger reminder_email_deliveries_set_updated_at
before update on public.reminder_email_deliveries
for each row execute function public.set_updated_at();

alter table public.reminder_email_deliveries enable row level security;

drop policy if exists "reminder email deliveries household scoped" on public.reminder_email_deliveries;
create policy "reminder email deliveries household scoped"
on public.reminder_email_deliveries for select
using (public.is_household_member(household_id));

-- Queue due reminder emails. Intended for service-role scheduled jobs / Edge Functions.
create or replace function public.enqueue_due_reminder_emails(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_calendar_count integer := 0;
  v_recurring_count integer := 0;
begin
  insert into public.reminder_email_deliveries (
    household_id,
    reminder_kind,
    calendar_reminder_id,
    scheduled_for,
    recipient_email,
    subject,
    body,
    metadata
  )
  select
    cr.household_id,
    'calendar',
    cr.id,
    (cr.reminder_date::timestamp + cr.reminder_time)::timestamptz,
    cr.reminder_email,
    'Finlo reminder: ' || cr.title,
    coalesce(cr.caption || E'\n\n', '') ||
      'Date: ' || cr.reminder_date::text || E'\n' ||
      'Time: ' || to_char(cr.reminder_time, 'HH24:MI'),
    jsonb_build_object('title', cr.title, 'caption', cr.caption, 'date', cr.reminder_date, 'time', cr.reminder_time)
  from public.calendar_reminders cr
  where cr.deleted_at is null
    and cr.reminder_enabled = true
    and cr.status in ('scheduled', 'failed')
    and cr.reminder_email is not null
    and cr.reminder_email <> ''
    and (cr.reminder_date::timestamp + cr.reminder_time)::timestamptz <= p_now
  on conflict do nothing;

  get diagnostics v_calendar_count = row_count;

  insert into public.reminder_email_deliveries (
    household_id,
    reminder_kind,
    recurring_rule_id,
    scheduled_for,
    recipient_email,
    subject,
    body,
    metadata
  )
  select
    rr.household_id,
    'recurring',
    rr.id,
    coalesce(
      rr.reminder_next_send_at,
      (
        coalesce(
          rr.reminder_date,
          rr.next_occurrence_on - make_interval(days => coalesce(
            case
              when (rr.metadata ->> 'reminder_days') ~ '^\d+$' then (rr.metadata ->> 'reminder_days')::integer
              else null
            end,
            3
          ))
        )::timestamp + rr.reminder_time
      )::timestamptz
    ),
    rr.reminder_email,
    'Finlo recurring reminder: ' || rr.name,
    'Reminder for ' || rr.name || E'\n\n' ||
      'Amount: ' || coalesce(rr.amount::text, '0') || ' ' || rr.currency || E'\n' ||
      'Due date: ' || coalesce(rr.next_occurrence_on::text, rr.starts_on::text) || E'\n' ||
      'Reminder time: ' || to_char(rr.reminder_time, 'HH24:MI'),
    jsonb_build_object('name', rr.name, 'amount', rr.amount, 'currency', rr.currency, 'dueDate', rr.next_occurrence_on, 'time', rr.reminder_time)
  from public.recurring_rules rr
  where rr.deleted_at is null
    and rr.status = 'active'
    and rr.reminder_enabled = true
    and rr.reminder_email is not null
    and rr.reminder_email <> ''
    and coalesce(
      rr.reminder_next_send_at,
      (
        coalesce(
          rr.reminder_date,
          rr.next_occurrence_on - make_interval(days => coalesce(
            case
              when (rr.metadata ->> 'reminder_days') ~ '^\d+$' then (rr.metadata ->> 'reminder_days')::integer
              else null
            end,
            3
          ))
        )::timestamp + rr.reminder_time
      )::timestamptz
    ) <= p_now
  on conflict do nothing;

  get diagnostics v_recurring_count = row_count;
  v_inserted := v_calendar_count + v_recurring_count;

  update public.calendar_reminders cr
  set status = 'scheduled'
  where exists (
    select 1
    from public.reminder_email_deliveries red
    where red.calendar_reminder_id = cr.id
      and red.status = 'pending'
      and red.deleted_at is null
  );

  update public.recurring_rules rr
  set reminder_status = 'scheduled'
  where exists (
    select 1
    from public.reminder_email_deliveries red
    where red.recurring_rule_id = rr.id
      and red.status = 'pending'
      and red.deleted_at is null
  );

  return v_inserted;
end;
$$;

comment on function public.enqueue_due_reminder_emails(timestamptz) is 'Queues due calendar and recurring reminder emails for a service-role sender.';

revoke all on function public.enqueue_due_reminder_emails(timestamptz) from public;
grant execute on function public.enqueue_due_reminder_emails(timestamptz) to service_role;
