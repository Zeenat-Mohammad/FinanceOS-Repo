import { supabase } from '@/data/supabase/client';
import type { IncomeSource } from '@/types/database';
import { throwDatabaseError } from './repositoryError';

export type IncomeSourceInput = {
  household_id: string;
  name: string;
  payer?: string | null;
  amount?: number | null;
  currency: string;
  frequency: IncomeSource['frequency'];
};

export const IncomeSourcesRepository = {
  async create(input: IncomeSourceInput): Promise<IncomeSource> {
    const { data, error } = await supabase.from('income_sources').insert(input).select('*').single();

    if (error) {
      throwDatabaseError('Failed to save income source', error);
    }

    return data as IncomeSource;
  }
};
