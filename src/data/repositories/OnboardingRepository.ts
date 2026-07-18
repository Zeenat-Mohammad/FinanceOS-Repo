import { HouseholdsRepository } from './HouseholdsRepository';
import { ProfileRepository } from './ProfileRepository';
import type { Household, Json, Profile } from '@/types/finance';

export type OnboardingData = {
  personalDetails?: Record<string, unknown>;
  accounts?: Record<string, unknown>[];
  income?: Record<string, unknown>[];
  bills?: Record<string, unknown>[];
  savings?: Record<string, unknown>;
  goals?: Record<string, unknown>[];
  debts?: Record<string, unknown>[];
  assets?: Record<string, unknown>[];
  investments?: Record<string, unknown>[];
  insurance?: Record<string, unknown>[];
  csvImport?: Record<string, unknown>;
  financialProfile?: {
    generatedAt: string;
    healthPlaceholder: 'not_calculated';
    completionNotes: string[];
  };
  completed_steps?: string[];
  skipped_steps?: string[];
  current_step?: string;
  progress_percentage?: number;
  completed_at?: string | null;
};

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export const OnboardingRepository = {
  async getState(userId: string): Promise<{ profile: Profile | null; household: Household | null; data: OnboardingData }> {
    const profile = await ProfileRepository.getCurrentProfile(userId);
    const household = await HouseholdsRepository.getCurrentHousehold(userId);
    const metadata = household ? asRecord(household.metadata) : {};

    return {
      profile,
      household,
      data: (metadata.onboarding ?? {}) as OnboardingData
    };
  },

  async saveStep(params: {
    userId: string;
    household: Household;
    stepId: string;
    stepData: Record<string, unknown> | Record<string, unknown>[];
    nextStepId?: string | null;
    completedSteps?: string[];
    skippedSteps?: string[];
    progressPercentage?: number;
    completedAt?: string | null;
    completed?: boolean;
  }): Promise<void> {
    const metadata = asRecord(params.household.metadata);
    const onboarding = {
      ...((metadata.onboarding ?? {}) as OnboardingData),
      [params.stepId]: params.stepData,
      completed_steps: params.completedSteps,
      skipped_steps: params.skippedSteps,
      current_step: params.nextStepId ?? params.stepId,
      progress_percentage: params.progressPercentage,
      completed_at: params.completedAt ?? null
    };

    await HouseholdsRepository.updateMetadata(params.household.id, {
      ...metadata,
      onboarding
    } as Json);

    await ProfileRepository.updateOnboardingProgress(params.userId, {
      onboarding_step: params.nextStepId ?? params.stepId,
      onboarding_completed: params.completed
    });
  },

  async finish(userId: string, household: Household, data: OnboardingData): Promise<void> {
    const metadata = asRecord(household.metadata);
    const financialProfile = {
      generatedAt: new Date().toISOString(),
      healthPlaceholder: 'not_calculated' as const,
      completionNotes: ['Initial profile created from onboarding responses.', 'Financial health calculation is reserved for a later phase.']
    };

    await HouseholdsRepository.updateMetadata(household.id, {
      ...metadata,
      onboarding: {
        ...data,
        financialProfile
      }
    } as Json);

    await ProfileRepository.updateOnboardingProgress(userId, {
      onboarding_step: 'complete',
      onboarding_completed: true
    });
  }
};
