import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Database,
  Home,
  LockKeyhole,
  RefreshCw,
  Shield,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminRepository } from '@/data/repositories/AdminRepository';
import { queryKeys } from '@/data/query-keys';
import type { AdminDashboardSummary, AdminSecurityEvent } from '@/types/admin';
import { Button, Card, ErrorState, LoadingState, Page, PageHeader } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export default function AdminDashboardPage() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: AdminRepository.getDashboardSummary,
    staleTime: 20_000
  });

  if (summaryQuery.isLoading) {
    return (
      <Page>
        <LoadingState label="Loading admin analytics" />
      </Page>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Page>
        <ErrorState
          title="Could not load admin dashboard"
          message={
            summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : 'Admin analytics could not be loaded. Check the admin role and migration state.'
          }
          action={
            <Button type="button" onClick={() => void summaryQuery.refetch()}>
              <RefreshCw aria-hidden className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </Page>
    );
  }

  const summary = summaryQuery.data;

  return (
    <Page>
      <PageHeader
        title="Admin Dashboard"
        description="Application-wide analytics, security logs, and operational health for Finlo."
        action={
          <Button className="border border-border bg-surface text-foreground hover:bg-secondary" type="button" onClick={() => void summaryQuery.refetch()}>
            <RefreshCw aria-hidden className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <AdminHero summary={summary} />

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Users"
          value={summary.users.total}
          hint={`${summary.users.newLast7Days} new in 7 days`}
          Icon={Users}
          tone="teal"
        />
        <MetricCard
          label="Households"
          value={summary.households.total}
          hint={`${summary.households.multiMemberHouseholds} multi-member`}
          Icon={Home}
          tone="green"
        />
        <MetricCard
          label="Ledger rows"
          value={summary.ledger.transactions}
          hint={`${summary.ledger.transactionsLast30Days} in 30 days`}
          Icon={Database}
          tone="purple"
        />
        <MetricCard
          label="Security events"
          value={summary.security.events}
          hint={`${summary.security.loginFailuresLast24Hours} login failures today`}
          Icon={LockKeyhole}
          tone={summary.security.loginFailuresLast24Hours > 0 ? 'red' : 'green'}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">User activation</h2>
              <p className="mt-1 text-sm text-muted">Onboarding completion across all profiles.</p>
            </div>
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              {percentage(summary.users.onboarded, summary.users.total).toFixed(0)}% onboarded
            </span>
          </div>
          <div className="mt-5 space-y-4">
            <ProgressRow label="Onboarded users" value={summary.users.onboarded} total={summary.users.total} tone="success" />
            <ProgressRow label="Pending onboarding" value={summary.users.pendingOnboarding} total={summary.users.total} tone="accent" />
            <ProgressRow label="New users, 7 days" value={summary.users.newLast7Days} total={Math.max(summary.users.total, 1)} tone="purple" />
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <h2 className="text-base font-semibold text-foreground">Ledger health</h2>
          <p className="mt-1 text-sm text-muted">Volume indicators derived from application tables.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SmallStat label="Accounts" value={summary.ledger.accounts} />
            <SmallStat label="Archived accounts" value={summary.ledger.archivedAccounts} />
            <SmallStat label="Recurring rules" value={summary.ledger.recurringRules} />
            <SmallStat label="Import batches" value={summary.ledger.importBatches} />
            <SmallStat label="Memberships" value={summary.households.memberships} />
            <SmallStat label="Generated" value={formatTime(summary.generatedAt)} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <EventPanel
          title="Recent logs"
          description="Latest security and account activity from the audit stream."
          events={summary.security.recentEvents}
          empty="No security logs yet."
        />
        <EventPanel
          title="Errors & attention"
          description="Login failures and suspicious activity signals."
          events={summary.security.recentErrors}
          empty="No recent error signals."
          attention
        />
      </section>
    </Page>
  );
}

function AdminHero({ summary }: { summary: AdminDashboardSummary }) {
  const attentionCount = summary.security.loginFailuresLast24Hours + summary.security.suspiciousEventsLast7Days;

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-[radial-gradient(circle_at_top_left,rgba(58,157,157,0.18),transparent_34%),linear-gradient(135deg,var(--color-primary),var(--color-secondary))] p-6 text-white">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-success/20 blur-3xl" />
      <div className="absolute bottom-0 right-24 h-28 w-28 rounded-full bg-purple/20 blur-2xl" />
      <div className="relative grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-success">
            <Shield aria-hidden className="h-3.5 w-3.5" />
            Role-based admin workspace
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Finlo control center</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            One dashboard for app-level analytics, activation, ledger volume, audit logs, and error signals.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <HeroSignal label="Total users" value={summary.users.total} />
          <HeroSignal label="Attention signals" value={attentionCount} danger={attentionCount > 0} />
        </div>
      </div>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  hint,
  Icon,
  tone
}: {
  label: string;
  value: number;
  hint: string;
  Icon: LucideIcon;
  tone: 'green' | 'teal' | 'purple' | 'red';
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{formatNumber(value)}</div>
          <div className="mt-2 text-xs text-muted">{hint}</div>
        </div>
        <div
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-brand',
            tone === 'green' && 'bg-success/15 text-success',
            tone === 'teal' && 'bg-accent/15 text-accent',
            tone === 'purple' && 'bg-purple/15 text-purple',
            tone === 'red' && 'bg-destructive/10 text-destructive'
          )}
        >
          <Icon aria-hidden className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function HeroSignal({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-brand border border-white/10 bg-white/10 p-4 shadow-soft backdrop-blur">
      <div className="text-[11px] uppercase tracking-wide text-white/60">{label}</div>
      <div className={cn('mt-2 text-2xl font-semibold tabular-nums', danger ? 'text-destructive-foreground' : 'text-white')}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  tone
}: {
  label: string;
  value: number;
  total: number;
  tone: 'success' | 'accent' | 'purple';
}) {
  const pct = percentage(value, total);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatNumber(value)} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary/30">
        <div
          className={cn('h-full rounded-full', tone === 'success' && 'bg-success', tone === 'accent' && 'bg-accent', tone === 'purple' && 'bg-purple')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-brand border border-border/60 bg-primary/20 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{typeof value === 'number' ? formatNumber(value) : value}</div>
    </div>
  );
}

function EventPanel({
  title,
  description,
  events,
  empty,
  attention
}: {
  title: string;
  description: string;
  events: AdminSecurityEvent[];
  empty: string;
  attention?: boolean;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {attention ? <AlertTriangle aria-hidden className="h-5 w-5 text-destructive" /> : <Activity aria-hidden className="h-5 w-5 text-accent" />}
      </div>

      {events.length === 0 ? (
        <div className="rounded-brand border border-dashed border-border p-5 text-sm text-muted">{empty}</div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <div key={event.id} className="rounded-brand border border-border/60 bg-primary/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{formatEventType(event.eventType)}</div>
                  <div className="mt-1 truncate text-xs text-muted">{event.userId}</div>
                </div>
                <time className="shrink-0 text-xs text-muted">{formatTime(event.createdAt)}</time>
              </div>
              {Object.keys(event.metadata ?? {}).length > 0 ? (
                <pre className="mt-2 max-h-20 overflow-auto rounded-md bg-background/60 p-2 text-[11px] text-muted">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return (value / total) * 100;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatEventType(value: string) {
  return value.replaceAll('_', ' ');
}
