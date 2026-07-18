import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent } from './number';

describe('number formatters', () => {
  it('formats plain numbers through the centralized formatter', () => {
    expect(formatNumber(123456)).toBe('123,456');
  });

  it('formats percentages through the centralized formatter', () => {
    expect(formatPercent(0.125)).toBe('12.5%');
  });
});
