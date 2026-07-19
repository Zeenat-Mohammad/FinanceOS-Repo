import { describe, expect, it } from 'vitest';
import { buildBudgetBundle, deriveBudgetAlerts } from './BudgetIntelligenceEngine';
import type { Category, Transaction } from '@/types/finance';

const category: Category = {
  id: 'category-1',
  household_id: 'household-1',
  user_id: 'user-1',
  name: 'Food',
  type: 'expense',
  color: '#b6d7a8',
  icon: 'utensils',
  sort_order: 0,
  budget_amount: 1_000,
  budget_period: 'monthly',
  budget_alerts_enabled: true,
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  version: 1
};

function transaction(id: string, amount: number, type: Transaction['type'] = 'expense'): Transaction {
  return {
    id,
    household_id: 'household-1',
    user_id: 'user-1',
    account_id: 'account-1',
    category_id: category.id,
    amount,
    type,
    date: '2026-07-10',
    status: 'posted',
    tags: [],
    metadata: {},
    soft_delete: false,
    is_recurring: false,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    deleted_at: null,
    version: 1
  };
}

describe('BudgetIntelligenceEngine', () => {
  it('derives actual spending from expenses net of refunds', () => {
    const bundle = buildBudgetBundle(
      [category],
      [transaction('expense-1', 800), transaction('refund-1', 50, 'refund')],
      new Date('2026-07-15T00:00:00Z')
    );
    expect(bundle.rows[0].spent).toBe(750);
    expect(bundle.rows[0].remaining).toBe(250);
    expect(bundle.rows[0].utilizationPct).toBe(75);
    expect(bundle.kpis.utilizationPct).toBe(75);
  });

  it('creates threshold and exceeded alert candidates', () => {
    const atNinety = buildBudgetBundle([category], [transaction('expense-1', 900)], new Date('2026-07-15T00:00:00Z'));
    expect(deriveBudgetAlerts(atNinety, new Date('2026-07-15T00:00:00Z')).map((alert) => alert.notificationType)).toContain('threshold_90');

    const exceeded = buildBudgetBundle([category], [transaction('expense-2', 1_100)], new Date('2026-07-15T00:00:00Z'));
    expect(deriveBudgetAlerts(exceeded, new Date('2026-07-15T00:00:00Z')).map((alert) => alert.notificationType)).toContain('exceeded');
  });
});

