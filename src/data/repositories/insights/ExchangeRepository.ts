import { FxRepository } from '@/data/repositories/FxRepository';
import { InsightsCache } from './InsightsCache';

export const ExchangeRepository = {
  async getRates(baseCurrency: string) {
    const key = `fx:${baseCurrency.toUpperCase()}`;
    const cached = InsightsCache.read(key, InsightsCache.MARKET_TTL);
    if (cached) return cached as Awaited<ReturnType<typeof FxRepository.getRates>>;
    const rates = await FxRepository.getRates(baseCurrency);
    InsightsCache.write(key, rates);
    return rates;
  },

  convert(amount: number, from: string, to: string, fx: Awaited<ReturnType<typeof FxRepository.getRates>>) {
    return FxRepository.convert(amount, from, to, fx);
  }
};
