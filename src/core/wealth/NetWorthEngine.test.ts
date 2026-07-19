import { describe, expect, it } from 'vitest';
import { NetWorthEngine } from './NetWorthEngine';
import type { Account } from '@/types/finance';
import type { DebtAccount } from '@/types/debt';
import type { InvestmentHolding } from '@/types/insights';

const baseAccount = {
  household_id: 'household-1',
  user_id: 'user-1',
  opening_balance: 0,
  currency: 'USD',
  is_archived: false,
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  version: 1
};

describe('NetWorthEngine source-of-truth handling', () => {
  it('does not count account-backed investment views twice', () => {
    const account: Account = {
      ...baseAccount,
      id: 'investment-account',
      name: 'Brokerage',
      type: 'investment',
      group_name: 'investment',
      balance: 10_000
    };
    const accountView: InvestmentHolding = {
      id: 'account:investment-account',
      household_id: 'household-1',
      user_id: 'user-1',
      asset_class: 'other_assets',
      ticker: null,
      name: 'Brokerage',
      quantity: 1,
      average_cost: 8_000,
      current_price: 10_000,
      currency: 'USD',
      logo_url: null,
      notes: null,
      metadata: { source: 'account', account_id: account.id },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null
    };
    const bundle = NetWorthEngine.build({ accounts: [account], holdings: [accountView], debts: [], currency: 'USD' });
    expect(bundle.overview.totalAssets).toBe(10_000);
    expect(bundle.overview.currentNetWorth).toBe(10_000);
  });

  it('does not count a linked liability account and debt record twice', () => {
    const card: Account = {
      ...baseAccount,
      id: 'card-account',
      name: 'Card',
      type: 'credit_card',
      group_name: 'credit_card',
      balance: -1_000
    };
    const debt: DebtAccount = {
      id: 'debt-1',
      household_id: 'household-1',
      user_id: 'user-1',
      name: 'Card debt',
      type: 'credit_card',
      balance_minor: 100_000,
      original_balance_minor: 100_000,
      apr_percent: 20,
      minimum_payment_minor: 5_000,
      monthly_payment_minor: 5_000,
      due_day: 10,
      extra_payment_allowed: true,
      lender: null,
      linked_account_id: card.id,
      notes: null,
      custom_order: 0,
      status: 'active',
      paid_off_at: null,
      total_interest_paid_minor: null,
      months_taken: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null
    };
    const bundle = NetWorthEngine.build({ accounts: [card], holdings: [], debts: [debt], currency: 'USD' });
    expect(bundle.overview.totalLiabilities).toBe(1_000);
  });
});

