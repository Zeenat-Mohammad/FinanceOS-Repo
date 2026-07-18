import { mean, standardDeviation } from 'simple-statistics';

/** Winsorize outliers beyond ±2σ of the series median band. */
export function smoothOutliers(values: number[], zThreshold = 2): number[] {
  if (values.length < 3) return [...values];
  const avg = mean(values);
  const sd = standardDeviation(values) || 1;
  return values.map((v) => {
    const z = Math.abs(v - avg) / sd;
    if (z <= zThreshold) return v;
    const sign = v >= avg ? 1 : -1;
    return avg + sign * zThreshold * sd;
  });
}

export function simpleMovingAverage(values: number[], window = 3): number[] {
  if (values.length === 0) return [];
  const w = Math.max(1, Math.min(window, values.length));
  return values.map((_, i) => {
    const start = Math.max(0, i - w + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function formatMonthLabel(year: number, month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month]} ${year}`;
}

export function addMonths(year: number, month: number, offset: number): { year: number; month: number } {
  const absolute = year * 12 + month + offset;
  return {
    year: Math.floor(absolute / 12),
    month: ((absolute % 12) + 12) % 12
  };
}

export function pctChange(current: number, projected: number): number {
  if (current === 0) return projected === 0 ? 0 : 100;
  return ((projected - current) / Math.abs(current)) * 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
