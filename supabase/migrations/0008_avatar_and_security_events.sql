-- Avatar URL on profiles + security hardening helpers.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'Public or signed storage path reference for user avatar';

-- Soft rate-limit audit log for sensitive actions (client + optional server use).
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_hint text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint security_events_type_check check (
    event_type in (
      'login_success',
      'login_failure',
      'password_change',
      'password_reset_request',
      'avatar_upload',
      'profile_update',
      'suspicious_activity'
    )
  )
);

create index if not exists security_events_user_created_idx
on public.security_events (user_id, created_at desc);

alter table public.security_events enable row level security;

drop policy if exists "security events are private" on public.security_events;
create policy "security events are private"
on public.security_events for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
