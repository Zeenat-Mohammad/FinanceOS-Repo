import type { ForecastScenario, ScenarioAssumptions } from '@/core/forecast';
import { Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';

const SCENARIOS: Array<{ id: ForecastScenario; label: string; blurb: string }> = [
  { id: 'current', label: 'Current', blurb: 'As-is trajectory' },
  { id: 'optimistic', label: 'Optimistic', blurb: 'Higher income, stronger returns' },
  { id: 'expected', label: 'Expected', blurb: 'Modest growth baseline' },
  { id: 'conservative', label: 'Conservative', blurb: 'Inflation pressure, lower returns' },
  { id: 'custom', label: 'Custom', blurb: 'Tune every assumption' }
];

export function ScenarioSwitcher({
  scenario,
  assumptions,
  onScenarioChange,
  onAssumptionsChange
}: {
  scenario: ForecastScenario;
  assumptions: ScenarioAssumptions;
  onScenarioChange: (s: ForecastScenario) => void;
  onAssumptionsChange: (patch: Partial<ScenarioAssumptions>) => void;
}) {
  return (
    <Card className="transition">
      <h2 className="text-sm font-semibold text-foreground">Scenario Switcher</h2>
      <p className="mt-1 text-xs text-muted">Switching recalculates the entire forecast instantly.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'rounded-brand border px-3 py-3 text-left transition',
              scenario === item.id ? 'border-accent bg-accent/15' : 'border-border bg-primary/40 hover:border-accent/40'
            )}
            onClick={() => onScenarioChange(item.id)}
          >
            <div className="text-sm font-medium text-foreground">{item.label}</div>
            <div className="mt-1 text-[11px] text-muted">{item.blurb}</div>
          </button>
        ))}
      </div>

      {scenario === 'custom' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SliderField label="Salary multiplier" value={assumptions.salaryMultiplier} min={0.5} max={1.5} step={0.01} onChange={(v) => onAssumptionsChange({ salaryMultiplier: v })} format={(v) => `${(v * 100).toFixed(0)}%`} />
          <SliderField label="Inflation" value={assumptions.inflationRate} min={0} max={0.12} step={0.005} onChange={(v) => onAssumptionsChange({ inflationRate: v })} format={(v) => `${(v * 100).toFixed(1)}%`} />
          <SliderField label="Investment return" value={assumptions.investmentReturnAnnual} min={0} max={0.15} step={0.005} onChange={(v) => onAssumptionsChange({ investmentReturnAnnual: v })} format={(v) => `${(v * 100).toFixed(1)}%`} />
          <SliderField label="Monthly savings Δ" value={assumptions.monthlySavingsDelta} min={-500} max={1000} step={25} onChange={(v) => onAssumptionsChange({ monthlySavingsDelta: v })} format={(v) => `$${v}`} />
          <SliderField label="Extra debt payment" value={assumptions.debtPaymentDelta} min={0} max={1000} step={25} onChange={(v) => onAssumptionsChange({ debtPaymentDelta: v })} format={(v) => `$${v}`} />
          <SliderField label="Tax rate" value={assumptions.taxRate} min={0} max={0.45} step={0.01} onChange={(v) => onAssumptionsChange({ taxRate: v })} format={(v) => `${(v * 100).toFixed(0)}%`} />
          <SliderField label="Large expense" value={assumptions.largeExpense} min={0} max={50000} step={500} onChange={(v) => onAssumptionsChange({ largeExpense: v })} format={(v) => `$${v.toLocaleString()}`} />
          <SliderField label="Extra income" value={assumptions.extraIncome} min={0} max={20000} step={250} onChange={(v) => onAssumptionsChange({ extraIncome: v })} format={(v) => `$${v.toLocaleString()}`} />
        </div>
      ) : null}
    </Card>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{format(value)}</span>
      </div>
      <input className="w-full accent-[var(--color-accent-teal)]" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
