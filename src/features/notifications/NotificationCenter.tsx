import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationRepository } from '@/data/repositories/NotificationRepository';
import { queryKeys } from '@/data/query-keys';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, LoadingState } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { FinancialNotification, FinancialNotificationSource } from '@/types/intelligence';

const SOURCE_LABELS: Partial<Record<FinancialNotificationSource, string>> = {
  goal: 'Goal alerts',
  budget: 'Budget alerts',
  debt: 'Debt reminders',
  bill: 'Upcoming bills',
  investment: 'Investment alerts',
  forecast: 'Forecast warnings',
  inflation: 'Inflation',
  news: 'News alerts',
  feedback: 'Feedback replies',
  system: 'System'
};

const SOURCE_ORDER: FinancialNotificationSource[] = [
  'budget',
  'goal',
  'debt',
  'bill',
  'investment',
  'forecast',
  'inflation',
  'news',
  'feedback',
  'system'
];

export function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const household = useAuthStore((state) => state.household);
  const [open, setOpen] = useState(false);
  const queryKey = queryKeys.notifications.all(household?.id ?? 'none', user?.id ?? 'none');
  const query = useQuery({
    queryKey,
    queryFn: () => NotificationRepository.list(household!.id, user!.id),
    enabled: Boolean(household && user),
    staleTime: 30_000,
    refetchInterval: 60_000
  });
  const markRead = useMutation({
    mutationFn: NotificationRepository.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });
  const markAll = useMutation({
    mutationFn: () => NotificationRepository.markAllRead(household!.id, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  const grouped = useMemo(() => {
    const map = new Map<FinancialNotificationSource, FinancialNotification[]>();
    for (const item of query.data ?? []) {
      const list = map.get(item.source_type) ?? [];
      list.push(item);
      map.set(item.source_type, list);
    }
    return SOURCE_ORDER.filter((source) => map.has(source)).map((source) => ({
      source,
      label: SOURCE_LABELS[source] ?? source,
      items: map.get(source) ?? []
    }));
  }, [query.data]);

  const unread = query.data?.filter((item) => !item.is_read).length ?? 0;

  function openItem(item: FinancialNotification) {
    if (!item.is_read) markRead.mutate(item);
    if (item.action_url) navigate(item.action_url);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-[var(--color-card-foreground)] transition hover:bg-secondary"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4" />
        {unread ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[9px] font-bold leading-4 text-white">
            {Math.min(99, unread)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="card-shell absolute right-0 z-50 mt-2 w-[min(92vw,26rem)] overflow-hidden p-0 shadow-xl">
          <div className="flex items-center justify-between border-b border-border p-3">
            <div>
              <div className="font-semibold text-[var(--color-card-foreground)]">Notifications</div>
              <div className="text-[11px] text-[var(--color-card-muted)]">
                Budget · Goals · Debt · Bills · Investments · Forecast · Feedback
              </div>
            </div>
            <Button className="h-8 border border-border bg-transparent px-2 text-foreground hover:bg-secondary" onClick={() => markAll.mutate()} disabled={!unread}>
              <CheckCheck className="h-3.5 w-3.5" /> All read
            </Button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {query.isLoading ? (
              <LoadingState label="Loading alerts" />
            ) : grouped.length ? (
              grouped.map((group) => (
                <section key={group.source} className="border-b border-border/60 last:border-b-0">
                  <div className="bg-surface-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-card-muted)]">
                    {group.label}
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'flex w-full gap-3 border-b border-border/40 p-3 text-left transition hover:bg-secondary/40 last:border-b-0',
                        !item.is_read && 'bg-accent/5'
                      )}
                      onClick={() => openItem(item)}
                    >
                      <span
                        className={cn(
                          'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                          item.severity === 'critical'
                            ? 'bg-destructive'
                            : item.severity === 'warning'
                              ? 'bg-amber-400'
                              : item.severity === 'success'
                                ? 'bg-success'
                                : 'bg-accent'
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="truncate text-sm font-medium text-[var(--color-card-foreground)]">{item.title}</span>
                        <span className="mt-1 block text-xs text-[var(--color-card-muted)]">{item.message}</span>
                        <span className="mt-1 block text-[10px] text-[var(--color-card-muted)]">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </span>
                      {item.action_url ? <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted" /> : null}
                    </button>
                  ))}
                </section>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-[var(--color-card-muted)]">No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
