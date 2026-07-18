import { supabase } from '@/data/supabase/client';
import type { Json, Transaction, TransactionType } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

export type TransactionFilters = {
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType | 'all';
  status?: Transaction['status'] | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'amount' | 'merchant' | 'created_at';
  sortDirection?: 'asc' | 'desc';
};

export type TransactionInput = {
  household_id: string;
  user_id: string;
  account_id: string;
  category_id?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  status?: Transaction['status'];
  merchant?: string | null;
  description?: string | null;
  notes?: string | null;
  tags?: string[];
  attachment_url?: string | null;
  parent_transaction_id?: string | null;
  split_group_id?: string | null;
  import_batch_id?: string | null;
  import_hash?: string | null;
  import_source?: string | null;
  external_reference?: string | null;
  metadata?: Json;
};

export type LedgerPage = {
  data: Transaction[];
  count: number;
};

export const TransactionsRepository = {
  async list(filters: TransactionFilters = {}): Promise<LedgerPage> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase.from('transactions').select('*', { count: 'exact' }).is('deleted_at', null);

    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.or(`description.ilike.${term},merchant.ilike.${term},notes.ilike.${term}`);
    }

    const { data, error, count } = await query
      .order(filters.sortBy ?? 'date', { ascending: filters.sortDirection === 'asc' })
      .range(from, to);

    if (error) throwDatabaseError('Failed to load ledger transactions', error);

    return { data: (data ?? []) as Transaction[], count: count ?? 0 };
  },

  async listByAccount(accountId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) throwDatabaseError('Failed to load account transactions', error);

    return (data ?? []) as Transaction[];
  },

  async listByPeriod(startDate: string, endDate: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) throwDatabaseError('Failed to load period transactions', error);

    return (data ?? []) as Transaction[];
  },

  async create(input: TransactionInput): Promise<Transaction> {
    const { data, error } = await supabase.from('transactions').insert(input).select('*').single();

    if (error) throwDatabaseError('Failed to create transaction', error);

    return data as Transaction;
  },

  async update(transactionId: string, input: Partial<Omit<TransactionInput, 'household_id' | 'user_id'>>): Promise<Transaction> {
    const { data, error } = await supabase.from('transactions').update(input).eq('id', transactionId).select('*').single();

    if (error) throwDatabaseError('Failed to update transaction', error);

    return data as Transaction;
  },

  async bulkDelete(transactionIds: string[]): Promise<void> {
    if (transactionIds.length === 0) return;

    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString(), soft_delete: true })
      .in('id', transactionIds);

    if (error) throwDatabaseError('Failed to bulk delete transactions', error);
  },

  async bulkCategorize(transactionIds: string[], categoryId: string): Promise<void> {
    if (transactionIds.length === 0) return;

    const { error } = await supabase.from('transactions').update({ category_id: categoryId }).in('id', transactionIds);

    if (error) throwDatabaseError('Failed to bulk categorize transactions', error);
  },

  async createTransfer(input: {
    household_id: string;
    user_id: string;
    from_account_id: string;
    to_account_id: string;
    amount: number;
    date: string;
    description?: string | null;
    notes?: string | null;
    tags?: string[];
  }): Promise<{ outgoing_id: string; incoming_id: string }> {
    const { data, error } = await supabase.rpc('create_transfer_transactions', {
      p_household_id: input.household_id,
      p_user_id: input.user_id,
      p_from_account_id: input.from_account_id,
      p_to_account_id: input.to_account_id,
      p_amount: input.amount,
      p_date: input.date,
      p_description: input.description ?? null,
      p_notes: input.notes ?? null,
      p_tags: input.tags ?? []
    });

    if (error) throwDatabaseError('Failed to create transfer', error);

    return (Array.isArray(data) ? data[0] : data) as { outgoing_id: string; incoming_id: string };
  },

  async createSplit(
    parent: TransactionInput,
    splits: Array<Omit<TransactionInput, 'household_id' | 'user_id' | 'account_id' | 'date' | 'type'>>
  ): Promise<Transaction[]> {
    const splitGroupId = crypto.randomUUID();
    const createdParent = await this.create({ ...parent, split_group_id: splitGroupId, metadata: { splitParent: true } });
    const createdSplits = await Promise.all(
      splits.map((split) =>
        this.create({
          ...parent,
          ...split,
          amount: split.amount,
          parent_transaction_id: createdParent.id,
          split_group_id: splitGroupId,
          metadata: { splitChild: true }
        })
      )
    );

    return [createdParent, ...createdSplits];
  }
};
