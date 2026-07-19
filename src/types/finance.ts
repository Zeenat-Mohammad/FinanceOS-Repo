export type AccountType = 'checking' | 'savings' | 'wallet' | 'cash' | 'credit_card' | 'investment' | 'crypto' | 'loan';
export type AccountGroup = 'bank' | 'cash' | 'credit_card' | 'investment' | 'loan' | 'wallet';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund' | 'adjustment' | 'opening_balance';
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  currency: string;
  country?: string | null;
  insights_country?: string | null;
  locale: string;
  timezone: string;
  salary_frequency?: string | null;
  family_size?: number | null;
  tax_preferences: Json;
  onboarding_completed: boolean;
  onboarding_step?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type Household = {
  id: string;
  name: string;
  owner_id: string;
  default_currency: string;
  locale: string;
  timezone: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_by?: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type Account = {
  id: string;
  household_id: string;
  user_id: string;
  name: string;
  type: AccountType;
  group_name: AccountGroup;
  balance: number;
  opening_balance: number;
  opening_balance_date?: string | null;
  currency: string;
  institution?: string | null;
  account_subtype?: string | null;
  credit_limit?: number | null;
  color?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type Category = {
  id: string;
  household_id: string;
  user_id: string;
  parent_id?: string | null;
  name: string;
  type: TransactionType;
  color?: string | null;
  icon?: string | null;
  sort_order: number;
  budget_amount?: number | null;
  budget_period?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  budget_start_date?: string | null;
  budget_end_date?: string | null;
  budget_alerts_enabled?: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type Transaction = {
  id: string;
  household_id: string;
  user_id: string;
  account_id: string;
  category_id?: string | null;
  parent_transaction_id?: string | null;
  split_group_id?: string | null;
  import_batch_id?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  status: 'expected' | 'pending' | 'posted' | 'reconciled' | 'void';
  merchant?: string | null;
  description?: string | null;
  notes?: string | null;
  tags: string[];
  attachment_url?: string | null;
  transfer_id?: string | null;
  import_hash?: string | null;
  import_source?: string | null;
  external_reference?: string | null;
  metadata: Json;
  soft_delete: boolean;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};
