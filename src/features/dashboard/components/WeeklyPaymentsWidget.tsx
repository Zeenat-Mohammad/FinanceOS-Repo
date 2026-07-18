import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { Check, Loader2 } from 'lucide-react';
import { CalendarRepository } from '@/data/repositories';
import { RecurringRepository } from '@/data/repositories/RecurringRepository';
import { queryKeys } from '@/data/query-keys';
import { formatCurrency } from '@/core/utils/currency';
import { cn } from '@/core/utils/cn';
import type { PaymentInstance } from '@/core/recurring';
import { Button, Card } from '@/shared/components';
import { EmptyWidget } from './EmptyWidget';

export function useCalendarWeek(householdId?: string, anchor = new Date()) {
  const weekKey = format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.calendar.week(householdId ?? 'none', weekKey),
    enabled: Boolean(householdId),
    queryFn: () => CalendarRepository.getWeek(householdId!, anchor),
    staleTime: 20_000
  });
}

function invalidatePaymentQueries(queryClient: ReturnType<typeof useQueryClient>, householdId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['calendar', householdId] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.recurring.workspace(householdId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(householdId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
  ]);
}

export function WeeklyPaymentsWidget({
  currency,
  householdId,
  userId,
  onOpenDetails
}: {
  currency: string;
  householdId?: string;
  userId?: string;
  onOpenDetails?: (instance: PaymentInstance) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const weekQuery = useCalendarWeek(householdId);

  const markPaidMutation = useMutation({
    mutationFn: async (instance: PaymentInstance) => {
      if (!householdId || !userId) throw new Error('Missing household or user');
      const rule = weekQuery.data?.rules.find((r) => r.id === instance.recurring_rule_id);
      if (!rule) throw new Error('Recurring rule not found');
      return RecurringRepository.markPaid({ householdId, userId, instance, rule });
    },
    onSuccess: () => {
      if (householdId) invalidatePaymentQueries(queryClient, householdId);
    }
  });

  const totals = useMemo(() => {
    const instances = weekQuery.data?.instances ?? [];
    const unpaid = instances.filter((i) => i.status === 'pending' || i.status === 'overdue');
    const paid = instances.filter((i) => i.status === 'paid');
    const upcoming = instances.reduce((sum, i) => sum + i.amount, 0);
    const paidTotal = paid.reduce((sum, i) => sum + i.amount, 0);
    const remaining = unpaid.reduce((sum, i) => sum + i.amount, 0);
    return { upcoming, paid: paidTotal, remaining };
  }, [weekQuery.data?.instances]);

  if (!householdId) {
    return (
      <EmptyWidget
        title="Sign in required"
        message="Connect a household to see this week's scheduled payments."
        ctaLabel="Open Recurring"
        ctaTo="/recurring"
      />
    );
  }

  if (weekQuery.isLoading) {
    return (
      <Card className="flex min-h-[280px] items-center justify-center transition">
        <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
        <span className="sr-only">Loading weekly payments</span>
      </Card>
    );
  }

  if (weekQuery.isError) {
    return (
      <Card className="transition">
        <p className="text-sm text-destructive">Couldn&apos;t load this week&apos;s payments.</p>
        <Button type="button" className="mt-3 bg-accent text-white hover:bg-accent/90" onClick={() => weekQuery.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const days = weekQuery.data?.days ?? [];
  const hasPayments = days.some((day) => day.instances.length > 0);

  if (!hasPayments) {
    return (
      <EmptyWidget
        title="Nothing scheduled this week"
        message="Add recurring bills or income to track payments on your dashboard."
        ctaLabel="Set up Recurring"
        ctaTo="/recurring"
      />
    );
  }

  return (
    <Card className="transition">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">Current week payments</div>
          <h2 className="mt-1 text-sm font-semibold text-foreground">Upcoming This Week</h2>
        </div>
        <Link to="/calendar" className="text-xs font-medium text-accent hover:underline">
          Open calendar →
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <TotalPill label="Upcoming" value={formatCurrency(totals.upcoming, currency)} tone="purple" />
        <TotalPill label="Paid" value={formatCurrency(totals.paid, currency)} tone="green" />
        <TotalPill label="Remaining" value={formatCurrency(totals.remaining, currency)} tone="teal" />
      </div>

      <div className="mt-4 space-y-4">
        {days.map((day) => {
          if (day.instances.length === 0) return null;
          const dayLabel = format(day.day, 'EEE');

          return (
            <div key={day.date}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{dayLabel}</div>
              <ul className="space-y-2">
                {day.instances.map((instance) => {
                  const isPaid = instance.status === 'paid';
                  const isOverdue = instance.status === 'overdue';
                  const canMarkPaid = !isPaid && (instance.status === 'pending' || instance.status === 'overdue');
                  const isIncome = instance.transaction_type === 'income';
                  const marking =
                    markPaidMutation.isPending && markPaidMutation.variables?.id === instance.id;

                  return (
                    <li key={instance.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => (onOpenDetails ? onOpenDetails(instance) : navigate('/calendar'))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onOpenDetails ? onOpenDetails(instance) : navigate('/calendar');
                          }
                        }}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-brand border border-border/50 bg-primary/20 px-3 py-2.5 transition hover:border-accent/40 hover:bg-primary/30',
                          isOverdue && 'border-destructive/40 bg-destructive/5'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{instance.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            {format(day.day, 'MMM d')}
                            {isOverdue ? ' · Overdue' : isPaid ? ' · Paid' : ' · Pending'}
                          </div>
                        </div>

                        <div
                          className={cn(
                            'shrink-0 text-sm tabular-nums',
                            isIncome ? 'text-success' : 'text-foreground',
                            isOverdue && !isIncome && 'text-destructive'
                          )}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(instance.amount, currency)}
                        </div>

                        {canMarkPaid ? (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={false}
                            aria-label={`Mark ${instance.name} as paid`}
                            disabled={!userId || marking}
                            onClick={(event) => {
                              event.stopPropagation();
                              markPaidMutation.mutate(instance);
                            }}
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-accent/60 bg-surface/80 transition hover:border-accent hover:bg-accent/10',
                              marking && 'opacity-60'
                            )}
                          >
                            {marking ? <Loader2 className="h-3 w-3 animate-spin text-accent" /> : null}
                          </button>
                        ) : isPaid ? (
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-success/60 bg-success/20 text-success"
                            aria-label="Paid"
                          >
                            <Check className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="h-5 w-5 shrink-0" aria-hidden />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {markPaidMutation.isError ? (
        <p className="mt-3 text-xs text-destructive">
          {markPaidMutation.error instanceof Error ? markPaidMutation.error.message : 'Could not mark payment as paid.'}
        </p>
      ) : null}
    </Card>
  );
}

function TotalPill({ label, value, tone }: { label: string; value: string; tone: 'purple' | 'green' | 'teal' }) {
  return (
    <div
      className={cn(
        'rounded-brand border px-3 py-2',
        tone === 'purple' && 'border-purple/30 bg-purple/10',
        tone === 'green' && 'border-success/30 bg-success/10',
        tone === 'teal' && 'border-accent/30 bg-accent/10'
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums',
          tone === 'purple' && 'text-purple',
          tone === 'green' && 'text-success',
          tone === 'teal' && 'text-accent'
        )}
      >
        {value}
      </div>
    </div>
  );
}
