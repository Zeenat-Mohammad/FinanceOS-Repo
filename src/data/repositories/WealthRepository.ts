import { supabase } from '@/data/supabase/client';
import type { InvestmentRecord, WealthDashboardSummary } from '@/types/wealth';
import type { Json } from '@/types/finance';
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

  async createInvestment(input: {
    household_id: string;
    user_id: string;
    investment_type: InvestmentRecord['investment_type'];
    name: string;
    linked_account_id?: string | null;
    purchase_date?: string | null;
    quantity: number;
    purchase_price: number;
    current_price: number;
    currency: string;
    broker?: string | null;
    notes?: string | null;
    tags?: string[];
    status: 'active' | 'archived';
  }): Promise<InvestmentRecord> {
    const { broker, tags = [], status, ...record } = input;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('investments')
      .insert({
        ...record,
        exchange: broker || null,
        metadata: { tags, status } satisfies Json,
        deleted_at: status === 'archived' ? now : null
      })
      .select('*')
      .single();
    if (error) throwDatabaseError('Failed to create investment', error);
    return data as InvestmentRecord;
  },

  async updateInvestment(id: string, input: Partial<InvestmentRecord>): Promise<InvestmentRecord> {
    const { data, error } = await supabase.from('investments').update(input).eq('id', id).select('*').single();
    if (error) throwDatabaseError('Failed to update investment', error);
    return data as InvestmentRecord;
  },

  async archiveInvestment(id: string): Promise<void> {
    const { error } = await supabase.from('investments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throwDatabaseError('Failed to archive investment', error);
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
