import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/types/finance';
import {
  selectAccountTotals,
  selectCashFlow,
  selectCategoryTotals,
  selectCurrentBalance,
  selectExpense,
  selectIncome,
  selectReconciliation,
  selectRefunds,
  selectTransfers
} from './selectors';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    household_id: 'household',
    user_id: 'user',
    account_id: 'checking',
    amount: 0,
    type: 'expense',
    date: '2026-01-01',
    status: 'posted',
    tags: [],
    soft_delete: false,
    is_recurring: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    version: 1,
    metadata: {},
    ...overrides
  };
}

describe('ledger selectors', () => {
  it('derives opening balances and normal account balances from transactions only', () => {
    const transactions = [tx({ type: 'opening_balance', amount: 500 }), tx({ type: 'expense', amount: 125 })];

    expect(selectCurrentBalance(transactions, 'checking')).toBe(375);
  });

  it('keeps linked transfers balanced and does not count them as cash flow', () => {
    const transactions = [
      tx({ id: 'out', type: 'transfer', amount: 100, transfer_id: 'in', metadata: { direction: 'outgoing' } }),
      tx({ id: 'in', account_id: 'savings', type: 'transfer', amount: 100, transfer_id: 'out', metadata: { direction: 'incoming' } })
    ];

    expect(selectAccountTotals(transactions)).toEqual({ checking: -100, savings: 100 });
    expect(selectTransfers(transactions)).toBe(100);
    expect(selectCashFlow(transactions)).toBe(0);
  });

  it('treats refunds as positive cash flow without inflating income', () => {
    const transactions = [tx({ type: 'income', amount: 1000 }), tx({ type: 'expense', amount: 250 }), tx({ type: 'refund', amount: 50 })];

    expect(selectIncome(transactions)).toBe(1000);
    expect(selectExpense(transactions)).toBe(250);
    expect(selectRefunds(transactions)).toBe(50);
    expect(selectCashFlow(transactions)).toBe(800);
  });

  it('supports split transaction category totals', () => {
    const transactions = [
      tx({ type: 'expense', amount: 100, category_id: 'parent', split_group_id: 'split', metadata: { splitParent: true } }),
      tx({ type: 'expense', amount: 60, category_id: 'food', parent_transaction_id: 'parent', split_group_id: 'split' }),
      tx({ type: 'expense', amount: 40, category_id: 'utilities', parent_transaction_id: 'parent', split_group_id: 'split' })
    ];

    expect(selectCategoryTotals(transactions)).toEqual({ food: 60, utilities: 40 });
    expect(selectCurrentBalance(transactions, 'checking')).toBe(-100);
  });

  it('reports balance reconciliation differences', () => {
    const result = selectReconciliation([tx({ type: 'opening_balance', amount: 200 }), tx({ type: 'adjustment', amount: 20 })], 'checking', 220);

    expect(result).toEqual({ currentBalance: 220, expectedBalance: 220, difference: 0, reconciled: true });
  });
});
