import { ArrowLeftRight, CreditCard, Plus, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/core/utils/cn';

const ACTIONS = [
  { id: 'tx', label: '+ Transaction', to: '/transactions', icon: Plus },
  { id: 'income', label: '+ Income', to: '/transactions', icon: Wallet },
  { id: 'transfer', label: '+ Transfer', to: '/transactions', icon: ArrowLeftRight },
  { id: 'debt', label: '+ Debt Payment', to: '/debt', icon: CreditCard }
] as const;

export function QuickActions() {
  return (
    <section aria-label="Quick actions" className="flex gap-2 overflow-x-auto pb-1">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.id}
            to={action.to}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-brand border border-border bg-[var(--color-sidebar)] px-3 py-2 text-xs font-medium text-white transition hover:bg-secondary'
            )}
          >
            <Icon className="h-3.5 w-3.5 text-success" />
            {action.label}
          </Link>
        );
      })}
    </section>
  );
}
