import type { ConfidenceLevel, SeriesForecast } from '@/core/forecast';
import { Card } from '@/shared/components';
import { ConfidencePill } from './ForecastCards';
import { cn } from '@/core/utils/cn';

export function ForecastConfidence({
  modules
}: {
  modules: Array<{ name: string; series: SeriesForecast }>;
}) {
  return (
    <Card className="transition">
      <h2 className="text-sm font-semibold text-foreground">Forecast Confidence</h2>
      <p className="mt-1 text-xs text-muted">Based on history length, completeness, seasonality, and backtest error</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((mod) => (
          <div key={mod.name} className="rounded-brand border border-border bg-primary/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-foreground">{mod.name}</span>
              <ConfidencePill level={mod.series.confidence} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className={cn('h-full rounded-full transition-all duration-700', confidenceColor(mod.series.confidence))}
                style={{ width: `${Math.round(mod.series.confidenceScore * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted">
              <span>{mod.series.algorithm.replace('_', ' ')}</span>
              <span>MAPE {(mod.series.mape * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-12 gap-1">
          {modules[0]?.series.forecast.slice(0, 12).map((point) => {
            const avg = modules.reduce((s, m) => s + m.series.confidenceScore, 0) / modules.length;
            return (
              <div key={point.label} className="space-y-1">
                <div className={cn('h-10 rounded-md', heatColor(avg))} title={`${point.label}: ${(avg * 100).toFixed(0)}%`} />
                <div className="truncate text-center text-[9px] text-muted">{point.label.split(' ')[0]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function confidenceColor(level: ConfidenceLevel) {
  if (level === 'high') return 'bg-success';
  if (level === 'medium') return 'bg-accent';
  return 'bg-purple';
}

function heatColor(score: number) {
  if (score >= 0.7) return 'bg-success/70';
  if (score >= 0.45) return 'bg-accent/60';
  return 'bg-purple/50';
}
