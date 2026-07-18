import { STRATEGY_DESCRIPTIONS, STRATEGY_LABELS, type DebtStrategy } from '@/core/debt';
import { Button } from '@/shared/components';

const PRESETS = [0, 100, 250, 500, 1000, 2000];

const SELECTABLE: DebtStrategy[] = ['avalanche', 'snowball', 'highest_payment', 'lowest_interest', 'custom'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DebtStrategySelector({
  strategy,
  startMonth,
  startYear,
  extraPaymentMajor,
  onStrategyChange,
  onStartMonthChange,
  onStartYearChange,
  onExtraPaymentChange,
  onSave,
  onExport
}: {
  strategy: DebtStrategy;
  startMonth: number;
  startYear: number;
  extraPaymentMajor: number;
  onStrategyChange: (strategy: DebtStrategy) => void;
  onStartMonthChange: (month: number) => void;
  onStartYearChange: (year: number) => void;
  onExtraPaymentChange: (major: number) => void;
  onSave: () => void;
  onExport: () => void;
}) {
  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="flex flex-col gap-4 rounded-brand border border-border bg-surface/80 p-4 shadow-card backdrop-blur">
      <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
        <label className="space-y-1.5 lg:col-span-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Strategy</span>
          <select className="select" value={strategy} onChange={(e) => onStrategyChange(e.target.value as DebtStrategy)}>
            {SELECTABLE.map((key) => (
              <option key={key} value={key}>
                {STRATEGY_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 lg:col-span-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Month</span>
          <select className="select" value={startMonth} onChange={(e) => onStartMonthChange(Number(e.target.value))}>
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 lg:col-span-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Year</span>
          <select className="select" value={startYear} onChange={(e) => onStartYearChange(Number(e.target.value))}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Monthly Extra Payment</span>
            <input
              className="input w-28 text-right"
              type="number"
              min={0}
              step={50}
              value={extraPaymentMajor}
              onChange={(e) => onExtraPaymentChange(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <input
            aria-label="Extra payment slider"
            className="w-full accent-[var(--color-accent-teal)]"
            type="range"
            min={0}
            max={2000}
            step={25}
            value={Math.min(2000, extraPaymentMajor)}
            onChange={(e) => onExtraPaymentChange(Number(e.target.value))}
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`rounded-md px-2 py-1 text-xs transition ${extraPaymentMajor === preset ? 'bg-accent text-white' : 'bg-primary text-muted hover:text-foreground'}`}
                onClick={() => onExtraPaymentChange(preset)}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
          <Button className="bg-success text-primary hover:bg-success/90" onClick={onSave}>
            Save Simulation
          </Button>
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onExport}>
            Export
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted">{STRATEGY_DESCRIPTIONS[strategy]}</p>
    </div>
  );
}
