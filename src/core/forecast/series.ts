import { estimateMape, runAlgorithm, selectAlgorithm, detectSeasonality } from './algorithms';
import type { ConfidenceLevel, SeriesForecast, TimePoint } from './types';
import { addMonths, formatMonthLabel, smoothOutliers, clamp } from './utils';

export function calculateConfidence(params: {
  historyLength: number;
  mape: number;
  seasonalityDetected: boolean;
  dataCompleteness: number;
}): { level: ConfidenceLevel; score: number } {
  const { historyLength, mape, seasonalityDetected, dataCompleteness } = params;
  let score = 0.4;
  score += clamp(historyLength / 24, 0, 0.25);
  score += clamp(dataCompleteness, 0, 1) * 0.2;
  score -= clamp(mape, 0, 1) * 0.35;
  if (seasonalityDetected) score += 0.08;
  score = clamp(score, 0.05, 0.95);

  const level: ConfidenceLevel = score >= 0.7 ? 'high' : score >= 0.45 ? 'medium' : 'low';
  return { level, score };
}

export function forecastSeries(
  values: number[],
  meta: { year: number; month: number; label: string }[],
  horizon: number,
  options?: { forceAlgorithm?: SeriesForecast['algorithm']; dataCompleteness?: number }
): SeriesForecast {
  const cleaned = smoothOutliers(values);
  const algorithm = options?.forceAlgorithm ?? selectAlgorithm(cleaned);
  const seasonality = detectSeasonality(cleaned);
  const projected = runAlgorithm(algorithm, cleaned, horizon);
  const mape = estimateMape(cleaned, algorithm);
  const { level, score } = calculateConfidence({
    historyLength: cleaned.length,
    mape,
    seasonalityDetected: seasonality.detected,
    dataCompleteness: options?.dataCompleteness ?? clamp(cleaned.length / 12, 0, 1)
  });

  const band = clamp(mape, 0.05, 0.4);

  const historical: TimePoint[] = cleaned.map((value, i) => ({
    year: meta[i]?.year ?? 0,
    month: meta[i]?.month ?? 0,
    label: meta[i]?.label ?? `M${i}`,
    value,
    kind: 'historical' as const
  }));

  const last = meta[meta.length - 1] ?? { year: new Date().getFullYear(), month: new Date().getMonth(), label: '' };
  const forecast: TimePoint[] = projected.map((value, i) => {
    const { year, month } = addMonths(last.year, last.month, i + 1);
    const absBand = Math.abs(value) * band + Math.abs(meanAbs(cleaned)) * band * 0.15;
    return {
      year,
      month,
      label: formatMonthLabel(year, month),
      value,
      kind: 'forecast' as const,
      lower: value - absBand,
      upper: value + absBand
    };
  });

  return {
    algorithm,
    confidence: level,
    confidenceScore: score,
    historical,
    forecast,
    series: [...historical, ...forecast],
    mape,
    seasonalityDetected: seasonality.detected
  };
}

function meanAbs(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + Math.abs(v), 0) / values.length;
}
