import type { User } from '@supabase/supabase-js';
import { CategoriesRepository, HouseholdsRepository, ProfileRepository } from '@/data/repositories';
import { HouseholdMissingError, ProfileMissingError, toAppError } from '@/shared/errors';
import { Logger } from '@/core/logging/Logger';
import type { Household, Profile } from '@/types/finance';

export type AuthInitializationResult = {
  profile: Profile;
  household: Household;
};

export async function ensureUserInitialized(
  user: User,
  profileInput?: {
    full_name?: string | null;
    country?: string | null;
    currency?: string;
  }
): Promise<AuthInitializationResult> {
  try {
    Logger.info('Auth initialization started', { userId: user.id });

    const profile = await ProfileRepository.ensureProfile({
      id: user.id,
      email: user.email,
      full_name: profileInput?.full_name ?? user.user_metadata?.full_name ?? null,
      country: profileInput?.country ?? user.user_metadata?.country,
      currency: profileInput?.currency ?? user.user_metadata?.currency
    });

    if (!profile) {
      throw new ProfileMissingError('Profile missing after ensureProfile', { userId: user.id });
    }

    let household = await HouseholdsRepository.getCurrentHousehold(user.id);

    if (!household) {
      Logger.warn('Household missing; attempting client-side repair', { userId: user.id });
      household = await HouseholdsRepository.createDefaultHousehold(user.id, profile);
      await HouseholdsRepository.createMembership({ household_id: household.id, user_id: user.id, role: 'owner' });
    }

    if (!household) {
      throw new HouseholdMissingError('Household missing after repair attempt', { userId: user.id });
    }

    await CategoriesRepository.ensureDefaultCategories({ household_id: household.id, user_id: user.id });
    Logger.info('Auth initialization completed', { userId: user.id, householdId: household.id });

    return { profile, household };
  } catch (error) {
    const appError = toAppError(error);
    Logger.error('Auth initialization failed', { userId: user.id, error, appError });
    throw appError;
  }
}
