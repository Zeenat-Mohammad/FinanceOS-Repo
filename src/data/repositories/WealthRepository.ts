import { supabase } from '@/data/supabase/client';
import type { WealthDashboardSummary } from '@/types/wealth';
import { throwDatabaseError } from './repositoryError';

export const WealthRepository = {
  async getDashboardSummary(householdId: string): Promise<WealthDashboardSummary> {
    const { data, error } = await supabase.rpc('get_wealth_dashboard_summary', {
      p_household_id: householdId
    });
    if (error) {
      return {
        investments: [],
        assets: [],
        crypto: [],
        loans: [],
        credit_cards: [],
        monthly_budgets: []
      };
    }
    return (data ?? {
      investments: [],
      assets: [],
      crypto: [],
      loans: [],
      credit_cards: [],
      monthly_budgets: []
    }) as WealthDashboardSummary;
  },

  async listInvestments(householdId: string) {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('name');
    if (error) throwDatabaseError('Failed to load investments', error);
    return data ?? [];
  },

  async listAssets(householdId: string) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('name');
    if (error) throwDatabaseError('Failed to load assets', error);
    return data ?? [];
  },

  async listCrypto(householdId: string) {
    const { data, error } = await supabase
      .from('crypto_assets')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('ticker');
    if (error) throwDatabaseError('Failed to load crypto assets', error);
    return data ?? [];
  },

  async listLoans(householdId: string) {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('name');
    if (error) throwDatabaseError('Failed to load loans', error);
    return data ?? [];
  },

  async listCreditCards(householdId: string) {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('card_name');
    if (error) throwDatabaseError('Failed to load credit cards', error);
    return data ?? [];
  }
};
