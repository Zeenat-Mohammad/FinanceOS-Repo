import { supabase } from '@/data/supabase/client';
import type { Bill } from '@/types/database';
import { throwDatabaseError } from './repositoryError';

export type BillInput = {
  household_id: string;
  name: string;
  biller?: string | null;
  amount: number;
  currency: string;
  due_day?: number | null;
};

export const BillsRepository = {
  async create(input: BillInput): Promise<Bill> {
    const { data, error } = await supabase.from('bills').insert(input).select('*').single();

    if (error) {
      throwDatabaseError('Failed to save bill', error);
    }

    return data as Bill;
  }
};
