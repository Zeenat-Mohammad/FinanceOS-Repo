export type AccountType = 'checking' | 'savings' | 'wallet' | 'cash' | 'credit_card' | 'investment' | 'crypto' | 'loan';
export type TransactionType = 'income' | 'expense' | 'transfer';

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  institution?: string | null;
  color?: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  description?: string | null;
  is_recurring: boolean;
  created_at: string;
};
