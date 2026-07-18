import { supabase } from '@/data/supabase/client';
import type { Household, HouseholdMember, Json } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

export const HouseholdsRepository = {
  async getCurrentHousehold(userId: string): Promise<Household | null> {
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throwDatabaseError('Failed to load household membership', membershipError);
    }

    if (!membership?.household_id) {
      return null;
    }

    const { data, error } = await supabase.from('households').select('*').eq('id', membership.household_id).maybeSingle();

    if (error) {
      throwDatabaseError('Failed to load household', error);
    }

    return data as Household | null;
  },

  async createDefaultHousehold(userId: string, profile?: { full_name?: string | null; currency?: string; locale?: string; timezone?: string }): Promise<Household> {
    const { data, error } = await supabase
      .from('households')
      .insert({
        owner_id: userId,
        name: profile?.full_name ? `${profile.full_name}'s Household` : 'My Household',
        default_currency: profile?.currency ?? 'USD',
        locale: profile?.locale ?? 'en-US',
        timezone: profile?.timezone ?? 'UTC',
        metadata: { settings: { initializedAt: new Date().toISOString() } }
      })
      .select('*')
      .single();

    if (error) {
      throwDatabaseError('Failed to repair missing household', error);
    }

    return data as Household;
  },

  async createMembership(input: { household_id: string; user_id: string; role?: 'owner' | 'admin' | 'member' | 'viewer' }): Promise<HouseholdMember> {
    const { data, error } = await supabase
      .from('household_members')
      .insert({
        household_id: input.household_id,
        user_id: input.user_id,
        role: input.role ?? 'owner'
      })
      .select('*')
      .single();

    if (error) {
      throwDatabaseError('Failed to repair missing household membership', error);
    }

    return data as HouseholdMember;
  },

  async listMembers(householdId: string): Promise<HouseholdMember[]> {
    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null);

    if (error) {
      throwDatabaseError('Failed to load household members', error);
    }

    return (data ?? []) as HouseholdMember[];
  },

  async updateMetadata(householdId: string, metadata: Json): Promise<Household> {
    const { data, error } = await supabase.from('households').update({ metadata }).eq('id', householdId).select('*').single();

    if (error) {
      throwDatabaseError('Failed to save household settings', error);
    }

    return data as Household;
  },

  async updateDefaults(
    householdId: string,
    patch: { default_currency?: string; locale?: string; timezone?: string; name?: string }
  ): Promise<Household> {
    const { data, error } = await supabase.from('households').update(patch).eq('id', householdId).select('*').single();

    if (error) {
      throwDatabaseError('Failed to update household defaults', error);
    }

    return data as Household;
  }
};
