import { Button } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export const WEALTH_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'investments', label: 'Investments' },
  { id: 'assets', label: 'Assets' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'credit-cards', label: 'Credit Cards' },
  { id: 'loans', label: 'Loans' },
  { id: 'net-worth', label: 'Net Worth' },
  { id: 'market', label: 'Market' }
] as const;

export type WealthTabId = (typeof WEALTH_TABS)[number]['id'];

export function WealthTabBar({ activeTab, onChange }: { activeTab: string; onChange: (tab: WealthTabId) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {WEALTH_TABS.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          className={cn(
            'border border-border bg-white text-[var(--color-card-foreground)] hover:bg-secondary',
            activeTab === tab.id && 'bg-accent text-white hover:bg-accent'
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
