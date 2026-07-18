import { InsightsCache } from './InsightsCache';
import { invokeInsightsProxy } from './invokeInsightsProxy';
import { buildTaxCenter } from '@/core/insights/countryPacks';
import type { TaxCenterContent } from '@/types/insights';

export const TaxRepository = {
  async getCenter(country: string): Promise<TaxCenterContent> {
    const key = `tax:${country.toUpperCase()}`;
    const cached = InsightsCache.read<TaxCenterContent>(key, InsightsCache.TAX_TTL);
    if (cached) return cached;

    await invokeInsightsProxy('tax', { country });
    const content = buildTaxCenter(country);
    InsightsCache.write(key, content);
    return content;
  }
};
