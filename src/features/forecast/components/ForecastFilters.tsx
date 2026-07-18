import type { ForecastHorizon } from '@/core/forecast';
import { FilterBar } from '@/shared/components';

/** Lightweight filter strip for forecast modules (range already in header). */
export function ForecastFilters({
  showHistorical,
  onShowHistoricalChange,
  horizon
}: {
  showHistorical: boolean;
  onShowHistoricalChange: (value: boolean) => void;
  horizon: ForecastHorizon;
}) {
  return (
    <FilterBar className="rounded-brand border border-border bg-surface/60 px-3 py-2 backdrop-blur-md">
      <span className="text-xs text-muted">Horizon: {horizon} months</span>
      <label className="ml-auto flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={showHistorical} onChange={(e) => onShowHistoricalChange(e.target.checked)} />
        Show historical series
      </label>
    </FilterBar>
  );
}
