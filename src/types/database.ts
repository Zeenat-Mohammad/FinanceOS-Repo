import type { Account, Category, Household, HouseholdMember, Json, Profile, Transaction } from './finance';

type Insertable<T, Generated extends keyof T = never> = Omit<T, Generated> & Partial<Pick<T, Generated>>;
type Updatable<T, Immutable extends keyof T = never> = Partial<Omit<T, Immutable>>;

export type RecurringRule = {
  id: string;
  household_id: string;
  account_id?: string | null;
  category_id?: string | null;
  name: string;
  transaction_type: 'income' | 'expense' | 'transfer';
  amount?: number | null;
  currency: string;
  cadence: 'daily' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  interval_count: number;
  day_of_month?: number | null;
  day_of_week?: number | null;
  starts_on: string;
  ends_on?: string | null;
  next_occurrence_on?: string | null;
  status: 'active' | 'paused' | 'ended';
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type ExpectedTransaction = {
  id: string;
  household_id: string;
  recurring_rule_id?: string | null;
  account_id?: string | null;
  category_id?: string | null;
  transaction_id?: string | null;
  name: string;
  transaction_type: 'income' | 'expense' | 'transfer';
  expected_amount: number;
  currency: string;
  expected_date: string;
  status: 'scheduled' | 'matched' | 'skipped' | 'cancelled';
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type Subscription = {
  id: string;
  household_id: string;
  recurring_rule_id?: string | null;
  name: string;
  vendor?: string | null;
  amount: number;
  currency: string;
  renewal_date?: string | null;
  status: 'active' | 'paused' | 'cancelled';
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type Bill = {
  id: string;
  household_id: string;
  recurring_rule_id?: string | null;
  account_id?: string | null;
  category_id?: string | null;
  name: string;
  biller?: string | null;
  amount: number;
  currency: string;
  due_day?: number | null;
  status: 'active' | 'paused' | 'ended';
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type IncomeSource = {
  id: string;
  household_id: string;
  recurring_rule_id?: string | null;
  account_id?: string | null;
  category_id?: string | null;
  name: string;
  payer?: string | null;
  amount?: number | null;
  currency: string;
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'annual' | 'irregular';
  status: 'active' | 'paused' | 'ended';
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type ImportBatch = {
  id: string;
  household_id: string;
  source: string;
  file_name?: string | null;
  status: 'pending' | 'imported' | 'rolled_back' | 'failed';
  summary: Json;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
};

export type Database = {
  public: {
    Tables: {
      households: {
        Row: Household;
        Insert: Insertable<Household, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'metadata'>;
        Update: Updatable<Household, 'id' | 'owner_id' | 'created_at'>;
      };
      household_members: {
        Row: HouseholdMember;
        Insert: Insertable<HouseholdMember, 'id' | 'joined_at' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>;
        Update: Updatable<HouseholdMember, 'id' | 'household_id' | 'user_id' | 'created_at'>;
      };
      profiles: {
        Row: Profile;
        Insert: Insertable<Profile, 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'tax_preferences' | 'onboarding_completed'>;
        Update: Updatable<Profile, 'id' | 'created_at'>;
      };
      accounts: {
        Row: Account;
        Insert: Insertable<
          Account,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'deleted_at'
          | 'version'
          | 'balance'
          | 'opening_balance'
          | 'group_name'
          | 'is_archived'
          | 'archived_at'
          | 'metadata'
        >;
        Update: Updatable<Account, 'id' | 'household_id' | 'user_id' | 'created_at'>;
      };
      categories: {
        Row: Category;
        Insert: Insertable<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'metadata'>;
        Update: Updatable<Category, 'id' | 'household_id' | 'user_id' | 'created_at'>;
      };
      transactions: {
        Row: Transaction;
        Insert: Insertable<
          Transaction,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'deleted_at'
          | 'version'
          | 'status'
          | 'tags'
          | 'soft_delete'
          | 'is_recurring'
          | 'metadata'
        >;
        Update: Updatable<Transaction, 'id' | 'household_id' | 'user_id' | 'created_at'>;
      };
      import_batches: {
        Row: ImportBatch;
        Insert: Insertable<ImportBatch, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'status' | 'summary'>;
        Update: Updatable<ImportBatch, 'id' | 'household_id' | 'created_at'>;
      };
      recurring_rules: {
        Row: RecurringRule;
        Insert: Insertable<
          RecurringRule,
          'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'interval_count' | 'status' | 'metadata'
        >;
        Update: Updatable<RecurringRule, 'id' | 'household_id' | 'created_at'>;
      };
      expected_transactions: {
        Row: ExpectedTransaction;
        Insert: Insertable<ExpectedTransaction, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'status' | 'metadata'>;
        Update: Updatable<ExpectedTransaction, 'id' | 'household_id' | 'created_at'>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Insertable<Subscription, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'status' | 'metadata'>;
        Update: Updatable<Subscription, 'id' | 'household_id' | 'created_at'>;
      };
      bills: {
        Row: Bill;
        Insert: Insertable<Bill, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'status' | 'metadata'>;
        Update: Updatable<Bill, 'id' | 'household_id' | 'created_at'>;
      };
      income_sources: {
        Row: IncomeSource;
        Insert: Insertable<IncomeSource, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version' | 'status' | 'metadata'>;
        Update: Updatable<IncomeSource, 'id' | 'household_id' | 'created_at'>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_household_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      is_household_member: {
        Args: { target_household_id: string };
        Returns: boolean;
      };
      can_access_profile: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      can_manage_household: {
        Args: { target_household_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          id: string;
          name: string;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          public: boolean;
          avif_autodetection?: boolean | null;
          file_size_limit?: number | null;
          allowed_mime_types?: string[] | null;
        };
        Insert: {
          id: string;
          name: string;
          public?: boolean;
          file_size_limit?: number | null;
          allowed_mime_types?: string[] | null;
        };
        Update: {
          public?: boolean;
          file_size_limit?: number | null;
          allowed_mime_types?: string[] | null;
        };
      };
    };
  };
};
