import { describe, expect, it } from 'vitest';
import { forecastHolt, forecastLinear, forecastHoltWinters, selectAlgorithm, detectSeasonality } from './algorithms';
import { ForecastEngine, ensureHistory } from './ForecastEngine';
import { DEFAULT_ASSUMPTIONS } from './types';
import { smoothOutliers } from './utils';

describe('forecast algorithms', () => {
  it('selects linear for short history', () => {
    expect(selectAlgorithm([1, 2])).toBe('linear');
  });

  it('selects holt for medium history', () => {
    expect(selectAlgorithm([10, 12, 11, 13, 14, 15, 16, 17])).toBe('holt');
  });

  it('linear forecast continues trend', () => {
    const out = forecastLinear([10, 20, 30, 40], 2);
    expect(out[0]).toBeGreaterThan(40);
    expect(out[1]).toBeGreaterThan(out[0]);
  });

  it('holt forecast produces horizon length', () => {
    const out = forecastHolt([100, 110, 105, 120, 125, 130], 6);
    expect(out).toHaveLength(6);
  });

  it('holt-winters falls back when season too short', () => {
    const out = forecastHoltWinters([1, 2, 3, 4, 5, 6], 3, 12);
    expect(out).toHaveLength(3);
  });

  it('smooths outliers', () => {
    const smoothed = smoothOutliers([10, 12, 11, 1000, 13, 12]);
    expect(smoothed[3]).toBeLessThan(1000);
  });

  it('detects seasonality on repeating pattern', () => {
    const values = Array.from({ length: 24 }, (_, i) => 100 + 20 * Math.sin((i / 12) * Math.PI * 2));
    const result = detectSeasonality(values);
    expect(result.strength).toBeGreaterThan(0.2);
  });
});

describe('ForecastEngine', () => {
  it('runs a full 24-month forecast deterministically', () => {
    const history = ensureHistory([]);
    const a = ForecastEngine.run({
      history,
      horizon: 24,
      scenario: 'expected',
      assumptions: DEFAULT_ASSUMPTIONS,
      activeWhatIfs: []
    });
    const b = ForecastEngine.run({
      history,
      horizon: 24,
      scenario: 'expected',
      assumptions: DEFAULT_ASSUMPTIONS,
      activeWhatIfs: []
    });

    expect(a.netWorth.forecast).toHaveLength(24);
    expect(a.monthlyTable.filter((r) => r.kind === 'forecast')).toHaveLength(24);
    expect(a.overview.projectedNetWorth).toBe(b.overview.projectedNetWorth);
    expect(a.insights.length).toBeGreaterThan(0);
  });

  it('optimistic scenario projects higher income path than conservative', () => {
    const history = ensureHistory([]);
    const optimistic = ForecastEngine.run({
      history,
      horizon: 12,
      scenario: 'optimistic',
      assumptions: DEFAULT_ASSUMPTIONS,
      activeWhatIfs: []
    });
    const conservative = ForecastEngine.run({
      history,
      horizon: 12,
      scenario: 'conservative',
      assumptions: DEFAULT_ASSUMPTIONS,
      activeWhatIfs: []
    });
    const optIncome = optimistic.income.forecast.reduce((s, p) => s + p.value, 0);
    const conIncome = conservative.income.forecast.reduce((s, p) => s + p.value, 0);
    expect(optIncome).toBeGreaterThan(conIncome);
  });

  it('what-if job loss reduces income in window', () => {
    const history = ensureHistory([]);
    const base = ForecastEngine.run({
      history,
      horizon: 12,
      scenario: 'current',
      assumptions: DEFAULT_ASSUMPTIONS,
      activeWhatIfs: []
    });
    const shocked = ForecastEngine.run({
      history,
      horizon: 12,
      scenario: 'current',
      assumptions: DEFAULT_ASSUMPTIONS,
      activeWhatIfs: ['job_loss_3']
    });
    expect(shocked.income.forecast[2].value).toBeLessThan(base.income.forecast[2].value);
  });

  it('exposes public forecast helpers', () => {
    const history = ensureHistory([]);
    expect(ForecastEngine.forecastIncome(history, 6, DEFAULT_ASSUMPTIONS).forecast).toHaveLength(6);
    expect(ForecastEngine.forecastExpenses(history, 6, DEFAULT_ASSUMPTIONS).forecast).toHaveLength(6);
    expect(ForecastEngine.forecastSavings(history, 6, DEFAULT_ASSUMPTIONS).forecast).toHaveLength(6);
    expect(ForecastEngine.forecastInvestments(history, 6, DEFAULT_ASSUMPTIONS).forecast).toHaveLength(6);
  });
});
