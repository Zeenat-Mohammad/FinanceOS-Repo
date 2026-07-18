import { describe, expect, it } from 'vitest';
import { DebtEngine } from './DebtEngine';
import { calculateInterest, toMinor } from './money';
import { orderDebtsByStrategy } from './strategies';
import type { EngineDebt } from './types';

const sampleDebts: EngineDebt[] = [
  {
    id: 'cc',
    name: 'Credit Card Visa',
    type: 'credit_card',
    balanceMinor: toMinor(4500),
    aprPercent: 24.99,
    minimumPaymentMinor: toMinor(150),
    monthlyPaymentMinor: toMinor(150),
    extraPaymentAllowed: true,
    originalBalanceMinor: toMinor(5000),
    customOrder: 0
  },
  {
    id: 'pl',
    name: 'Personal Loan',
    type: 'personal_loan',
    balanceMinor: toMinor(8200),
    aprPercent: 11.5,
    minimumPaymentMinor: toMinor(280),
    monthlyPaymentMinor: toMinor(280),
    extraPaymentAllowed: true,
    originalBalanceMinor: toMinor(10000),
    customOrder: 1
  },
  {
    id: 'car',
    name: 'Car Loan',
    type: 'car_loan',
    balanceMinor: toMinor(9800),
    aprPercent: 6.9,
    minimumPaymentMinor: toMinor(320),
    monthlyPaymentMinor: toMinor(320),
    extraPaymentAllowed: true,
    originalBalanceMinor: toMinor(15000),
    customOrder: 2
  },
  {
    id: 'sl',
    name: 'Student Loan',
    type: 'student_loan',
    balanceMinor: toMinor(5950),
    aprPercent: 5.2,
    minimumPaymentMinor: toMinor(200),
    monthlyPaymentMinor: toMinor(200),
    extraPaymentAllowed: true,
    originalBalanceMinor: toMinor(8000),
    customOrder: 3
  }
];

const baseParams = {
  debts: sampleDebts,
  extraPaymentMinor: toMinor(300),
  startMonth: 5,
  startYear: 2024
};

describe('DebtEngine money helpers', () => {
  it('calculates monthly interest in minor units', () => {
    // 450000 * 0.2499 / 12 = 9371.25 → 9371
    expect(calculateInterest(toMinor(4500), 24.99)).toBe(9371);
  });

  it('returns zero interest for zero balance', () => {
    expect(calculateInterest(0, 24.99)).toBe(0);
  });
});

describe('strategy ordering', () => {
  it('orders snowball by lowest balance', () => {
    expect(orderDebtsByStrategy(sampleDebts, 'snowball')[0]).toBe('cc');
  });

  it('orders avalanche by highest APR', () => {
    expect(orderDebtsByStrategy(sampleDebts, 'avalanche')[0]).toBe('cc');
  });

  it('orders custom by customOrder', () => {
    expect(orderDebtsByStrategy(sampleDebts, 'custom')).toEqual(['cc', 'pl', 'car', 'sl']);
  });
});

describe('DebtEngine simulations', () => {
  it('avalanche pays less interest than minimum payments', () => {
    const avalanche = DebtEngine.calculateAvalanche(baseParams);
    const minimum = DebtEngine.run({ ...baseParams, strategy: 'minimum', extraPaymentMinor: 0 });

    expect(avalanche.monthsToPayoff).toBeGreaterThan(0);
    expect(avalanche.totalInterestMinor).toBeLessThan(minimum.totalInterestMinor);
    expect(avalanche.interestSavedMinor).toBeGreaterThan(0);
  });

  it('snowball pays the smallest balance first', () => {
    const snowball = DebtEngine.calculateSnowball(baseParams);
    expect(snowball.payoffOrder[0]).toBe('cc');
  });

  it('avalanche targets highest APR first', () => {
    const avalanche = DebtEngine.calculateAvalanche(baseParams);
    expect(avalanche.payoffOrder[0]).toBe('cc');
  });

  it('extra payment reduces months to payoff', () => {
    const withExtra = DebtEngine.calculateAvalanche(baseParams);
    const without = DebtEngine.calculateAvalanche({ ...baseParams, extraPaymentMinor: 0 });
    expect(withExtra.monthsToPayoff).toBeLessThan(without.monthsToPayoff);
  });

  it('generates amortization that ends at zero balance', () => {
    const schedule = DebtEngine.generateAmortization({ ...baseParams, strategy: 'avalanche' });
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[schedule.length - 1].endingBalanceMinor).toBe(0);
  });

  it('timeline includes start, paid_off, and all_clear events', () => {
    const timeline = DebtEngine.generateTimeline({ ...baseParams, strategy: 'avalanche' });
    expect(timeline.some((e) => e.kind === 'start')).toBe(true);
    expect(timeline.some((e) => e.kind === 'paid_off')).toBe(true);
    expect(timeline.some((e) => e.kind === 'all_clear')).toBe(true);
  });

  it('compareStrategies highlights best interest option', () => {
    const comparison = DebtEngine.compareStrategies(baseParams);
    const avalanche = comparison.results.find((r) => r.strategy === 'avalanche');
    const snowball = comparison.results.find((r) => r.strategy === 'snowball');
    expect(avalanche).toBeTruthy();
    expect(snowball).toBeTruthy();
    expect(avalanche!.totalInterestMinor).toBeLessThanOrEqual(snowball!.totalInterestMinor);
    expect(comparison.bestByInterest).toBe('avalanche');
  });

  it('custom order follows customOrder ranks', () => {
    const customDebts = sampleDebts.map((d, i) => ({ ...d, customOrder: 3 - i }));
    const result = DebtEngine.calculateCustom({ ...baseParams, debts: customDebts });
    expect(result.payoffOrder[0]).toBe('sl');
  });

  it('is deterministic across identical runs', () => {
    const a = DebtEngine.calculateAvalanche(baseParams);
    const b = DebtEngine.calculateAvalanche(baseParams);
    expect(a.totalInterestMinor).toBe(b.totalInterestMinor);
    expect(a.monthsToPayoff).toBe(b.monthsToPayoff);
    expect(a.schedule.length).toBe(b.schedule.length);
  });

  it('produces insights without AI', () => {
    const selected = DebtEngine.calculateAvalanche(baseParams);
    const comparison = DebtEngine.compareStrategies(baseParams);
    const insights = DebtEngine.generateInsights({
      debts: sampleDebts,
      selected,
      comparison,
      extraPaymentMinor: baseParams.extraPaymentMinor
    });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.every((i) => i.body.length > 0)).toBe(true);
  });
});
