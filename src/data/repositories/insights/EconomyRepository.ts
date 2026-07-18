import { InsightsCache } from './InsightsCache';
import { invokeInsightsProxy } from './invokeInsightsProxy';
import { buildEconomySnapshot } from '@/core/insights/countryPacks';
import type { EconomySnapshot } from '@/types/insights';

export const EconomyRepository = {
  async getSnapshot(country: string): Promise<EconomySnapshot> {
    const key = `economy:${country.toUpperCase()}`;
    const cached = InsightsCache.read<EconomySnapshot>(key, InsightsCache.ECONOMY_TTL);
    if (cached) return cached;

    await invokeInsightsProxy('economy', { country });
    const snapshot = buildEconomySnapshot(country);
    InsightsCache.write(key, snapshot);
    return snapshot;
  }
};
