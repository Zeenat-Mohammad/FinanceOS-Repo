import { Download, RefreshCw } from 'lucide-react';
import type { ForecastHorizon } from '@/core/forecast';
import { Button } from '@/shared/components';

const RANGES: Array<{ value: ForecastHorizon; label: string; disabled?: boolean }> = [
  { value: 6, label: '6 Months' },
  { value: 12, label: '12 Months' },
  { value: 24, label: '24 Months' },
  { value: 36, label: '36 Months', disabled: true }
];

export function ForecastHeader({
  horizon,
  onHorizonChange,
  onRefresh,
  onDownload,
  refreshing
}: {
  horizon: ForecastHorizon;
  onHorizonChange: (h: ForecastHorizon) => void;
  onRefresh: () => void;
  onDownload: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-brand border border-border bg-gradient-to-br from-primary via-surface to-secondary/35 p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Forecast Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">See where your finances are heading over the next 24 months.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-brand border border-border bg-primary/50 p-1">
            {RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                disabled={range.disabled}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  horizon === range.value ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
                }`}
                onClick={() => onHorizonChange(range.value)}
                title={range.disabled ? 'Coming soon' : undefined}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Forecast
          </Button>
          <Button className="bg-success text-primary hover:bg-success/90" onClick={onDownload}>
            <Download className="h-4 w-4" /> Download Report
          </Button>
        </div>
      </div>
    </div>
  );
}
