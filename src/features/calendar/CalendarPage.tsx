import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { RecurringRepository } from '@/data/repositories/RecurringRepository';
import { queryKeys } from '@/data/query-keys';
import type { PaymentInstance } from '@/core/recurring';
import { Button, Card, LoadingState, Page } from '@/shared/components';
import { useLedgerContext } from '@/features/ledger/useLedgerContext';
import { EmptyWidget } from '@/features/dashboard/components/EmptyWidget';
import { useCalendarWorkspace } from './useCalendarWorkspace';
import { MonthCalendar } from './components/MonthCalendar';
import { WeekCalendar } from './components/WeekCalendar';
import { DayDrawer } from './components/DayDrawer';

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { user, household, loading } = useLedgerContext();
  const currency = household?.default_currency ?? 'USD';

  const workspace = useCalendarWorkspace(household?.id);
  const {
    anchor,
    view,
    setView,
    selectedDate,
    selectDay,
    clearSelectedDay,
    rulesMap,
    dayMap,
    weekDays,
    goPrev,
    goNext,
    goToday,
    isLoading,
    rules
  } = workspace;

  const headerLabel = useMemo(() => {
    if (view === 'month') return format(anchor, 'MMMM yyyy');
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
      return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
    }
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }, [anchor, view]);

  const invalidateCalendar = async () => {
    if (!household?.id) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['calendar', household.id] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.recurring.workspace(household.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(household.id) })
    ]);
  };

  const markPaidMutation = useMutation({
    mutationFn: async (instance: PaymentInstance) => {
      const rule = rulesMap.get(instance.recurring_rule_id);
      if (!rule) throw new Error('Recurring rule not found.');
      return RecurringRepository.markPaid({
        householdId: household!.id,
        userId: user!.id,
        instance,
        rule
      });
    },
    onSuccess: invalidateCalendar
  });

  const skipMutation = useMutation({
    mutationFn: (instance: PaymentInstance) => RecurringRepository.skipInstance(household!.id, instance),
    onSuccess: invalidateCalendar
  });

  const markingId = markPaidMutation.isPending
    ? markPaidMutation.variables?.id ?? null
    : skipMutation.isPending
      ? skipMutation.variables?.id ?? null
      : null;

  if (loading || isLoading) {
    return <LoadingState label="Loading financial calendar" />;
  }

  if (!household || !user) {
    return <LoadingState label="Preparing calendar workspace" />;
  }

  const hasRules = rules.some((rule) => !rule.deleted_at && rule.status === 'active');
  const drawerInstances = selectedDate
    ? workspace.instances.filter((instance) => instance.scheduled_date === selectedDate)
    : [];

  return (
    <Page className="relative">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <CalendarDays className="h-5 w-5" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Financial Calendar</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{headerLabel}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Track recurring income and bills across the month. Select a day to mark payments or skip occurrences.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-brand border border-border bg-primary/50 p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  view === 'month' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
                }`}
                onClick={() => setView('month')}
              >
                Month
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  view === 'week' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
                }`}
                onClick={() => setView('week')}
              >
                Week
              </button>
            </div>

            <Button
              className="border border-border bg-transparent px-3 text-foreground hover:bg-secondary"
              onClick={goPrev}
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button className="border border-border bg-transparent px-3 text-foreground hover:bg-secondary" onClick={goToday}>
              Today
            </Button>
            <Button
              className="border border-border bg-transparent px-3 text-foreground hover:bg-secondary"
              onClick={goNext}
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {!hasRules ? (
        <EmptyWidget
          title="No recurring payments yet"
          message="Add recurring income or bills to populate your financial calendar."
          ctaLabel="Set up recurring"
          ctaTo="/recurring"
        />
      ) : view === 'month' ? (
        <MonthCalendar
          anchor={anchor}
          dayMap={dayMap}
          currency={currency}
          selectedDate={selectedDate}
          onSelectDay={selectDay}
        />
      ) : (
        <WeekCalendar
          days={weekDays}
          currency={currency}
          selectedDate={selectedDate}
          onSelectDay={selectDay}
        />
      )}

      {selectedDate ? (
        <DayDrawer
          date={selectedDate}
          instances={drawerInstances.length > 0 ? drawerInstances : workspace.instances.filter((i) => i.scheduled_date === selectedDate)}
          rules={rulesMap}
          currency={currency}
          markingId={markingId}
          onClose={clearSelectedDay}
          onMarkPaid={(instance) => markPaidMutation.mutate(instance)}
          onSkip={(instance) => skipMutation.mutate(instance)}
        />
      ) : null}

      <Card className="flex items-start gap-3 border-border/70 bg-surface/60 p-4 text-sm text-muted backdrop-blur-sm">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-purple" aria-hidden />
        <p>
          Tip: click any day to review payments. Mark items paid to post a transaction, or skip one-off occurrences
          without affecting future schedules.
        </p>
      </Card>
    </Page>
  );
}
