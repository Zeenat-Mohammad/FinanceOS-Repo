-- Admin dashboard foundation.
-- Access is based on Supabase Auth JWT app_metadata:
--   app_metadata.role = 'admin' | 'super_admin'
--   OR app_metadata.roles contains 'admin' | 'super_admin'

create or replace function public.is_app_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin'), false)
    or exists (
      select 1
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(auth.jwt() -> 'app_metadata' -> 'roles') = 'array'
            then auth.jwt() -> 'app_metadata' -> 'roles'
          else '[]'::jsonb
        end
      ) as role_name(value)
      where role_name.value in ('admin', 'super_admin')
    );
$$;

comment on function public.is_app_admin() is 'Returns true when the authenticated JWT has an admin or super_admin app role.';

create or replace function public.get_admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generatedAt', now(),
    'users', jsonb_build_object(
      'total', (select count(*) from public.profiles where deleted_at is null),
      'onboarded', (select count(*) from public.profiles where deleted_at is null and onboarding_completed = true),
      'pendingOnboarding', (select count(*) from public.profiles where deleted_at is null and onboarding_completed = false),
      'newLast7Days', (select count(*) from public.profiles where created_at >= now() - interval '7 days')
    ),
    'households', jsonb_build_object(
      'total', (select count(*) from public.households where deleted_at is null),
      'memberships', (select count(*) from public.household_members where deleted_at is null),
      'multiMemberHouseholds', (
        select count(*)
        from (
          select household_id
          from public.household_members
          where deleted_at is null
          group by household_id
          having count(*) > 1
        ) grouped_members
      )
    ),
    'ledger', jsonb_build_object(
      'accounts', (select count(*) from public.accounts where deleted_at is null),
      'archivedAccounts', (select count(*) from public.accounts where deleted_at is null and is_archived = true),
      'transactions', (select count(*) from public.transactions where deleted_at is null and soft_delete = false),
      'transactionsLast30Days', (
        select count(*)
        from public.transactions
        where deleted_at is null
          and soft_delete = false
          and date >= current_date - 30
      ),
      'recurringRules', (select count(*) from public.recurring_rules where deleted_at is null),
      'importBatches', (select count(*) from public.import_batches where deleted_at is null)
    ),
    'security', jsonb_build_object(
      'events', (select count(*) from public.security_events),
      'loginFailuresLast24Hours', (
        select count(*)
        from public.security_events
        where event_type = 'login_failure'
          and created_at >= now() - interval '24 hours'
      ),
      'suspiciousEventsLast7Days', (
        select count(*)
        from public.security_events
        where event_type = 'suspicious_activity'
          and created_at >= now() - interval '7 days'
      ),
      'recentEvents', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'userId', user_id,
            'eventType', event_type,
            'metadata', metadata,
            'userAgent', user_agent,
            'createdAt', created_at
          )
          order by created_at desc
        )
        from (
          select id, user_id, event_type, metadata, user_agent, created_at
          from public.security_events
          order by created_at desc
          limit 12
        ) recent_security_events
      ), '[]'::jsonb),
      'recentErrors', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'userId', user_id,
            'eventType', event_type,
            'metadata', metadata,
            'userAgent', user_agent,
            'createdAt', created_at
          )
          order by created_at desc
        )
        from (
          select id, user_id, event_type, metadata, user_agent, created_at
          from public.security_events
          where event_type in ('login_failure', 'suspicious_activity')
          order by created_at desc
          limit 8
        ) recent_error_events
      ), '[]'::jsonb)
    )
  )
  into v_payload;

  return v_payload;
end;
$$;

comment on function public.get_admin_dashboard_summary() is 'Read-only app-wide admin analytics. Requires public.is_app_admin().';

revoke all on function public.get_admin_dashboard_summary() from public;
grant execute on function public.get_admin_dashboard_summary() to authenticated;
