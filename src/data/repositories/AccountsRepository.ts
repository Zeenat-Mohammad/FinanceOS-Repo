import { supabase } from '@/data/supabase/client';
import type { Account, AccountGroup } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

export type AccountInput = {
  household_id: string;
  user_id: string;
  name: string;
  type: Account['type'];
  group_name: AccountGroup;
  institution?: string | null;
  opening_balance: number;
  opening_balance_date?: string | null;
  currency: string;
};

export const AccountsRepository = {
  async list(): Promise<Account[]> {
    const { data, error } = await supabase.from('accounts').select('*').is('deleted_at', null).order('created_at', { ascending: false });

    if (error) throwDatabaseError('Failed to load accounts', error);

    return (data ?? []) as Account[];
  },

  async getById(accountId: string): Promise<Account | null> {
    const { data, error } = await supabase.from('accounts').select('*').eq('id', accountId).maybeSingle();

    if (error) throwDatabaseError('Failed to load account', error);

    return data as Account | null;
  },

  async create(input: AccountInput): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...input,
        balance: 0,
        opening_balance_date:
          input.opening_balance !== 0 ? input.opening_balance_date || new Date().toISOString().slice(0, 10) : input.opening_balance_date
      })
      .select('*')
      .single();

    if (error) throwDatabaseError('Failed to create account', error);

    return data as Account;
  },

  async update(accountId: string, input: Partial<Omit<AccountInput, 'household_id' | 'user_id'>>): Promise<Account> {
    const { data, error } = await supabase.from('accounts').update(input).eq('id', accountId).select('*').single();

    if (error) throwDatabaseError('Failed to update account', error);

    return data as Account;
  },

  async archive(accountId: string): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq('id', accountId)
      .select('*')
      .single();

    if (error) throwDatabaseError('Failed to archive account', error);

    return data as Account;
  },

  async restore(accountId: string): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update({ is_archived: false, archived_at: null })
      .eq('id', accountId)
      .select('*')
      .single();

    if (error) throwDatabaseError('Failed to restore account', error);
    return data as Account;
  },

  async remove(accountId: string): Promise<void> {
    const { error } = await supabase.from('accounts').update({ deleted_at: new Date().toISOString(), is_archived: true }).eq('id', accountId);

    if (error) throwDatabaseError('Failed to delete account', error);
  }
};
