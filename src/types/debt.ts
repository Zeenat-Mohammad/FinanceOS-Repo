import type { DebtStrategy, DebtType } from '@/core/debt';

export type { DebtStrategy, DebtType };

/** Persisted debt account — money stored as integer minor units. */
export type DebtAccount = {
  id: string;
  household_id: string;
  user_id: string;
  name: string;
  type: DebtType;
  balance_minor: number;
  original_balance_minor: number;
  apr_percent: number;
  minimum_payment_minor: number;
  monthly_payment_minor: number;
  due_day: number | null;
  extra_payment_allowed: boolean;
  lender: string | null;
  linked_account_id: string | null;
  notes: string | null;
  custom_order: number;
  status: 'active' | 'paid_off' | 'archived';
  paid_off_at: string | null;
  total_interest_paid_minor: number | null;
  months_taken: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DebtAccountInput = {
  household_id: string;
  user_id: string;
  name: string;
  type: DebtType;
  balance_minor: number;
  original_balance_minor?: number;
  apr_percent: number;
  minimum_payment_minor: number;
  monthly_payment_minor: number;
  due_day?: number | null;
  extra_payment_allowed?: boolean;
  lender?: string | null;
  linked_account_id?: string | null;
  notes?: string | null;
  custom_order?: number;
};

export type DebtSimulationSettings = {
  strategy: DebtStrategy;
  start_month: number;
  start_year: number;
  extra_payment_minor: number;
  custom_order: string[];
  saved_at: string | null;
};

export type DebtCenterState = {
  debts: DebtAccount[];
  settings: DebtSimulationSettings;
};
