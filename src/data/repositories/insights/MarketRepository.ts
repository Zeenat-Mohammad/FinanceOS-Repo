import { InsightsCache } from './InsightsCache';
import { invokeInsightsProxy } from './invokeInsightsProxy';

export type MarketQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
};

export const MarketRepository = {
  async getQuotes(symbols: string[]): Promise<{ source: string; quotes: MarketQuote[] }> {
    const key = `market:${symbols.map((s) => s.toUpperCase()).sort().join(',')}`;
    const cached = InsightsCache.read<{ source: string; quotes: MarketQuote[] }>(key, InsightsCache.MARKET_TTL);
    if (cached) return cached;

    const live = await invokeInsightsProxy<{ source?: string; quotes?: Array<Record<string, number | string | boolean>> }>('marketQuotes', {
      symbols
    });

    const quotes: MarketQuote[] = (live?.quotes ?? [])
      .filter((q) => typeof q.price === 'number')
      .map((q) => ({
        symbol: String(q.symbol),
        price: Number(q.price),
        change: Number(q.change ?? 0),
        changePercent: Number(q.changePercent ?? 0)
      }));

    // Demo quotes when edge/providers unavailable
    const fallback: MarketQuote[] =
      quotes.length > 0
        ? quotes
        : symbols.map((symbol, i) => ({
            symbol,
            price: 100 + i * 17.5,
            change: (i % 2 === 0 ? 1 : -1) * (0.4 + i * 0.15),
            changePercent: (i % 2 === 0 ? 1 : -1) * (0.35 + i * 0.1)
          }));

    const payload = { source: live?.source ?? 'curated', quotes: fallback };
    InsightsCache.write(key, payload);
    return payload;
  },

  async getCrypto(ids: string[] = ['bitcoin', 'ethereum']) {
    const key = `crypto:${ids.join(',')}`;
    const cached = InsightsCache.read(key, InsightsCache.MARKET_TTL);
    if (cached) return cached as { source: string; quotes: Record<string, { usd: number; usd_24h_change?: number }> };

    const live = await invokeInsightsProxy<{ source?: string; quotes?: Record<string, { usd: number; usd_24h_change?: number }> }>('cryptoQuotes', {
      ids
    });

    const payload = {
      source: live?.source ?? 'curated',
      quotes:
        live?.quotes ??
        ({
          bitcoin: { usd: 64000, usd_24h_change: 1.2 },
          ethereum: { usd: 3200, usd_24h_change: -0.4 }
        } as Record<string, { usd: number; usd_24h_change?: number }>)
    };
    InsightsCache.write(key, payload);
    return payload;
  }
};
