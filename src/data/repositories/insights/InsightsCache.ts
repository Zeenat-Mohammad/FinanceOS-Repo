type CacheEntry<T> = { cachedAt: number; payload: T };

const PREFIX = 'finlo.insights.cache.';

export const InsightsCache = {
  read<T>(key: string, ttlMs: number): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (Date.now() - parsed.cachedAt > ttlMs) return null;
      return parsed.payload;
    } catch {
      return null;
    }
  },

  write<T>(key: string, payload: T) {
    try {
      const entry: CacheEntry<T> = { cachedAt: Date.now(), payload };
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // ignore quota
    }
  },

  /** Market quotes — 15 minutes */
  MARKET_TTL: 15 * 60_000,
  /** News — 30 minutes */
  NEWS_TTL: 30 * 60_000,
  /** Economy / tax — 12 hours */
  ECONOMY_TTL: 12 * 60 * 60_000,
  TAX_TTL: 12 * 60 * 60_000
};
