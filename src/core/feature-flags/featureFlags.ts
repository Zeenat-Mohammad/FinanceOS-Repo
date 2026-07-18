export type FeatureFlag =
  | 'ai'
  | 'scenarioSimulator'
  | 'replay'
  | 'automation'
  | 'bankSync'
  | 'tax';

export const featureFlags: Record<FeatureFlag, boolean> = {
  ai: false,
  scenarioSimulator: false,
  replay: false,
  automation: false,
  bankSync: false,
  tax: false
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
