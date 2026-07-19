import { supabase } from '@/data/supabase/client';
import { buildGoalsBundle } from '@/core/goals/SmartGoalEngine';
import type { GoalContribution, GoalsBundle, SmartGoal } from '@/types/intelligence';
import type { Json } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

export type SmartGoalInput = {
  household_id: string;
  user_id: string;
  name: string;
  description?: string | null;
  goal_type: SmartGoal['goal_type'];
  priority: SmartGoal['priority'];
  target_amount: number;
  current_amount?: number;
  currency: string;
  target_date?: string | null;
  expected_monthly_contribution?: number;
  linked_account_id?: string | null;
  linked_investment_id?: string | null;
  auto_contribution?: boolean;
  inflation_adjustment_pct?: number;
  goal_image_path?: string | null;
  notes?: string | null;
  status?: SmartGoal['status'];
  metadata?: Json;
};

export const GoalsRepository = {
  async list(householdId: string): Promise<SmartGoal[]> {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throwDatabaseError('Failed to load SMART goals', error);
    return (data ?? []) as SmartGoal[];
  },

  async listContributions(householdId: string): Promise<GoalContribution[]> {
    const { data, error } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('contribution_date', { ascending: false });
    if (error) throwDatabaseError('Failed to load goal contributions', error);
    return (data ?? []) as GoalContribution[];
  },

  async getBundle(householdId: string): Promise<GoalsBundle> {
    const [goals, contributions] = await Promise.all([this.list(householdId), this.listContributions(householdId)]);
    return buildGoalsBundle(goals, contributions);
  },

  async create(input: SmartGoalInput): Promise<SmartGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        ...input,
        current_amount: input.current_amount ?? 0,
        expected_monthly_contribution: input.expected_monthly_contribution ?? 0,
        auto_contribution: input.auto_contribution ?? false,
        inflation_adjustment_pct: input.inflation_adjustment_pct ?? 0,
        status: input.status ?? 'active',
        metadata: input.metadata ?? {}
      })
      .select('*')
      .single();
    if (error) throwDatabaseError('Failed to create SMART goal', error);
    return data as SmartGoal;
  },

  async update(goalId: string, input: Partial<Omit<SmartGoalInput, 'household_id' | 'user_id'>>): Promise<SmartGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .update(input)
      .eq('id', goalId)
      .select('*')
      .single();
    if (error) throwDatabaseError('Failed to update SMART goal', error);
    return data as SmartGoal;
  },

  async recordContribution(input: {
    goalId: string;
    amount: number;
    source?: GoalContribution['source'];
    notes?: string | null;
    accountId?: string | null;
    investmentId?: string | null;
    transactionId?: string | null;
  }): Promise<SmartGoal> {
    const { data, error } = await supabase.rpc('record_goal_contribution', {
      p_goal_id: input.goalId,
      p_amount: input.amount,
      p_source: input.source ?? 'manual',
      p_notes: input.notes ?? null,
      p_account_id: input.accountId ?? null,
      p_investment_id: input.investmentId ?? null,
      p_transaction_id: input.transactionId ?? null
    });
    if (error) throwDatabaseError('Failed to record goal contribution', error);
    return data as SmartGoal;
  },

  async archive(goalId: string): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error) throwDatabaseError('Failed to archive SMART goal', error);
  }
};

