import { Bell, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/shared/components';

export function DashboardHeader({
  firstName,
  currency,
  monthLabel,
  onQuickAdd
}: {
  firstName: string;
  currency: string;
  monthLabel: string;
  onQuickAdd: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-muted">Finlo workspace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          {greeting}, <span className="text-foreground">{firstName}</span>
          <span className="mx-2 text-border">·</span>
          {format(new Date(), 'EEEE, MMM d, yyyy')}
          <span className="mx-2 text-border">·</span>
          {monthLabel}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          className="rounded-md border border-border bg-surface/70 p-2 text-muted backdrop-blur hover:text-foreground"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-md border border-border bg-surface/70 p-2 text-muted backdrop-blur hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
        <span className="rounded-md border border-border bg-primary/60 px-2.5 py-2 text-xs font-medium text-muted" title="Currency from household settings">
          {currency}
        </span>
        <Button className="bg-[var(--color-button)] text-white hover:bg-[var(--color-button-hover)]" onClick={onQuickAdd}>
          <Plus className="h-4 w-4" /> Quick Add
        </Button>
      </div>
    </div>
  );
}
