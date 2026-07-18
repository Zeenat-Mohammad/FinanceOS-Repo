import regression from 'regression';
import { mean } from 'simple-statistics';
import type { ForecastAlgorithm } from './types';

/** Ordinary least squares linear regression via regression-js. */
export function forecastLinear(values: number[], horizon: number): number[] {
  if (values.length === 0) return Array(horizon).fill(0);
  if (values.length === 1) return Array(horizon).fill(values[0]);

  const points = values.map((y, x) => [x, y] as [number, number]);
  const result = regression.linear(points);
  const start = values.length;
  return Array.from({ length: horizon }, (_, i) => result.predict(start + i)[1]);
}

/** Polynomial regression (degree 2) via regression-js. */
export function forecastPolynomial(values: number[], horizon: number, order = 2): number[] {
  if (values.length < order + 1) return forecastLinear(values, horizon);
  const points = values.map((y, x) => [x, y] as [number, number]);
  const result = regression.polynomial(points, { order });
  const start = values.length;
  return Array.from({ length: horizon }, (_, i) => result.predict(start + i)[1]);
}

/**
 * Holt's linear trend method (double exponential smoothing).
 * Suitable for 3–12 months of history without strong seasonality.
 */
export function forecastHolt(values: number[], horizon: number, alpha = 0.3, beta = 0.1): number[] {
  if (values.length === 0) return Array(horizon).fill(0);
  if (values.length === 1) return Array(horizon).fill(values[0]);

  let level = values[0];
  let trend = values[1] - values[0];

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  return Array.from({ length: horizon }, (_, h) => level + (h + 1) * trend);
}

/**
 * Holt-Winters additive triple exponential smoothing.
 * seasonLength defaults to 12 (monthly seasonality).
 */
export function forecastHoltWinters(
  values: number[],
  horizon: number,
  seasonLength = 12,
  alpha = 0.4,
  beta = 0.1,
  gamma = 0.2
): number[] {
  if (values.length < seasonLength * 2) {
    return forecastHolt(values, horizon);
  }

  const seasons = Math.floor(values.length / seasonLength);
  const seasonals = Array.from({ length: seasonLength }, (_, i) => {
    let sum = 0;
    for (let s = 0; s < seasons; s++) sum += values[s * seasonLength + i];
    return sum / seasons - mean(values.slice(0, seasons * seasonLength));
  });

  let level = mean(values.slice(0, seasonLength));
  let trend =
    (mean(values.slice(seasonLength, seasonLength * 2)) - mean(values.slice(0, seasonLength))) / seasonLength;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const season = seasonals[i % seasonLength];
    const prevLevel = level;
    level = alpha * (val - season) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonals[i % seasonLength] = gamma * (val - level) + (1 - gamma) * season;
  }

  return Array.from({ length: horizon }, (_, h) => {
    const season = seasonals[(values.length + h) % seasonLength];
    return level + (h + 1) * trend + season;
  });
}

/** Single exponential smoothing. */
export function forecastExponentialSmoothing(values: number[], horizon: number, alpha = 0.35): number[] {
  if (values.length === 0) return Array(horizon).fill(0);
  let level = values[0];
  for (let i = 1; i < values.length; i++) {
    level = alpha * values[i] + (1 - alpha) * level;
  }
  // Gentle drift from last delta
  const drift = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;
  return Array.from({ length: horizon }, (_, h) => level + drift * (h + 1) * 0.5);
}

/** Autocorrelation-based seasonality detection at lag 12 (or 6). */
export function detectSeasonality(values: number[]): { detected: boolean; period: number; strength: number } {
  if (values.length < 6) return { detected: false, period: 0, strength: 0 };

  const candidates = [12, 6, 4, 3].filter((p) => values.length >= p * 2);
  let best = { detected: false, period: 0, strength: 0 };

  for (const period of candidates) {
    const strength = autocorrelation(values, period);
    if (strength > best.strength) {
      best = { detected: strength > 0.35, period, strength };
    }
  }
  return best;
}

function autocorrelation(values: number[], lag: number): number {
  if (values.length <= lag) return 0;
  const avg = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    den += (values[i] - avg) ** 2;
    if (i >= lag) num += (values[i] - avg) * (values[i - lag] - avg);
  }
  if (den === 0) return 0;
  return num / den;
}

/**
 * Pick algorithm from engine rules:
 * < 3 months → linear
 * 3–12 months → Holt
 * recurring patterns → Holt-Winters / seasonal
 */
export function selectAlgorithm(values: number[]): ForecastAlgorithm {
  if (values.length < 3) return 'linear';
  const seasonality = detectSeasonality(values);
  if (seasonality.detected && values.length >= (seasonality.period || 12) * 2) {
    return 'holt_winters';
  }
  if (values.length >= 3 && values.length <= 12) return 'holt';
  if (values.length > 12 && seasonality.strength > 0.2) return 'seasonal_trend';
  if (values.length > 8) return 'polynomial';
  return 'exponential_smoothing';
}

export function runAlgorithm(algorithm: ForecastAlgorithm, values: number[], horizon: number): number[] {
  switch (algorithm) {
    case 'linear':
      return forecastLinear(values, horizon);
    case 'holt':
      return forecastHolt(values, horizon);
    case 'holt_winters':
    case 'seasonal_trend':
      return forecastHoltWinters(values, horizon);
    case 'polynomial':
      return forecastPolynomial(values, horizon);
    case 'exponential_smoothing':
    default:
      return forecastExponentialSmoothing(values, horizon);
  }
}

/** Mean absolute percentage error on one-step backtest. */
export function estimateMape(values: number[], algorithm: ForecastAlgorithm): number {
  if (values.length < 4) return 0.35;
  const train = values.slice(0, -2);
  const actual = values.slice(-2);
  const predicted = runAlgorithm(algorithm, train, 2);
  let total = 0;
  let count = 0;
  for (let i = 0; i < actual.length; i++) {
    if (Math.abs(actual[i]) < 1e-6) continue;
    total += Math.abs((actual[i] - predicted[i]) / actual[i]);
    count += 1;
  }
  return count === 0 ? 0.25 : total / count;
}
