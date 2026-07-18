import { supabase } from '@/data/supabase/client';
import type { ImportBatch } from '@/types/database';
import type { Json } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

export const ImportBatchesRepository = {
  async create(input: { household_id: string; file_name?: string | null; summary?: Json }): Promise<ImportBatch> {
    const { data, error } = await supabase
      .from('import_batches')
      .insert({ household_id: input.household_id, file_name: input.file_name, source: 'csv', summary: input.summary ?? {} })
      .select('*')
      .single();

    if (error) throwDatabaseError('Failed to create import batch', error);

    return data as ImportBatch;
  },

  async complete(batchId: string, summary: Json): Promise<ImportBatch> {
    const { data, error } = await supabase.from('import_batches').update({ status: 'imported', summary }).eq('id', batchId).select('*').single();

    if (error) throwDatabaseError('Failed to complete import batch', error);

    return data as ImportBatch;
  },

  async rollback(batchId: string): Promise<number> {
    const { data, error } = await supabase.rpc('rollback_import_batch', { p_import_batch_id: batchId });

    if (error) throwDatabaseError('Failed to rollback import batch', error);

    return Number(data ?? 0);
  }
};
