import { describe, expect, it } from 'vitest';
import {
  PaymentEngine,
  cadenceToMonthlyFactor,
  resolveInstanceStatus,
  buildVirtualInstances,
  computeRecurringStats
} from './PaymentEngine';
import type { RecurringRule } from '@/types/database';

function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'rule-1',
    household_id: 'hh-1',
    account_id: 'acc-1',
    category_id: 'cat-1',
    name: 'Netflix',
    transaction_type: 'expense',
    amount: 799,
    currency: 'INR',
    cadence: 'monthly',
    interval_count: 1,
    starts_on: '2026-01-25',
    next_occurrence_on: '2026-07-25',
    ends_on: null,
    status: 'active',
    day_of_month: 25,
    metadata: { kind: 'subscription', reminder_days: 3, auto_create_transaction: true },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    version: 1,
    ...overrides
  } as RecurringRule;
}

describe('PaymentEngine', () => {
  it('maps cadence to monthly factors', () => {
    expect(cadenceToMonthlyFactor('monthly')).toBeCloseTo(1);
    expect(cadenceToMonthlyFactor('annual')).toBeCloseTo(1 / 12);
    expect(cadenceToMonthlyFactor('weekly')).toBeCloseTo(52 / 12);
  });

  it('marks past unpaid dates as overdue', () => {
    expect(resolveInstanceStatus('2020-01-01', 'pending', new Date('2026-07-18'))).toBe('overdue');
    expect(resolveInstanceStatus('2099-01-01', 'pending', new Date('2026-07-18'))).toBe('pending');
    expect(resolveInstanceStatus('2020-01-01', 'paid', new Date('2026-07-18'))).toBe('paid');
  });

  it('generates virtual instances without duplicates', () => {
    const rule = makeRule();
    const existing = [
      {
        id: 'existing-1',
        household_id: 'hh-1',
        recurring_rule_id: 'rule-1',
        transaction_id: null,
        scheduled_date: '2026-07-25',
        paid_date: null,
        status: 'pending' as const,
        amount: 799,
        currency: 'INR',
        name: 'Netflix',
        transaction_type: 'expense' as const,
        metadata: {}
      }
    ];

    const instances = buildVirtualInstances(
      [rule],
      new Date('2026-07-01'),
      new Date('2026-08-31'),
      existing
    );

    const july = instances.filter((i) => i.scheduled_date === '2026-07-25');
    expect(july).toHaveLength(1);
    expect(july[0].id).toBe('existing-1');
    expect(instances.some((i) => i.scheduled_date === '2026-08-25')).toBe(true);
  });

  it('computes monthly commitment and overdue totals', () => {
    const expense = makeRule();
    const income = makeRule({
      id: 'rule-2',
      name: 'Salary',
      transaction_type: 'income',
      amount: 80000,
      metadata: { kind: 'income' }
    });

    const stats = computeRecurringStats(
      [expense, income],
      [
        {
          id: 'i1',
          household_id: 'hh-1',
          recurring_rule_id: 'rule-1',
          transaction_id: null,
          scheduled_date: '2026-07-10',
          paid_date: null,
          status: 'overdue',
          amount: 799,
          currency: 'INR',
          name: 'Netflix',
          transaction_type: 'expense',
          metadata: {}
        }
      ],
      new Date('2026-07-18')
    );

    expect(stats.monthlyExpense).toBeCloseTo(799);
    expect(stats.monthlyIncome).toBeCloseTo(80000);
    expect(stats.activeSubscriptions).toBe(1);
    expect(stats.overdueCount).toBe(1);
    expect(stats.overdueAmount).toBe(799);
  });

  it('exposes engine facade', () => {
    expect(PaymentEngine.getRecurringMeta(makeRule()).kind).toBe('subscription');
  });
});
