import { supabase } from '@/data/supabase/client';
import type { AdminDashboardSummary } from '@/types/admin';
import { throwDatabaseError } from './repositoryError';

export const AdminRepository = {
  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const { data, error } = await supabase.rpc('get_admin_dashboard_summary');

    if (error) {
      throwDatabaseError('Failed to load admin dashboard', error);
    }

    return data as AdminDashboardSummary;
  }
};
