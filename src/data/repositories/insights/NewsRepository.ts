import { InsightsCache } from './InsightsCache';
import { invokeInsightsProxy } from './invokeInsightsProxy';
import { buildCountryNews } from '@/core/insights/countryPacks';
import type { NewsArticle } from '@/types/insights';

export const NewsRepository = {
  async list(country: string, holdingsTickers: string[] = []): Promise<{ general: NewsArticle[]; personalized: NewsArticle[] }> {
    const key = `news:${country.toUpperCase()}:${holdingsTickers.sort().join(',')}`;
    const cached = InsightsCache.read<{ general: NewsArticle[]; personalized: NewsArticle[] }>(key, InsightsCache.NEWS_TTL);
    if (cached) return cached;

    const live = await invokeInsightsProxy<{ articles?: NewsArticle[]; source?: string }>('news', {
      country,
      query: `${country} finance economy markets`
    });

    const curated = buildCountryNews(country);
    const liveMapped: NewsArticle[] = (live?.articles ?? []).map((a, i) => ({
      id: `live-${i}`,
      category: 'markets',
      title: a.title,
      summary: a.summary,
      url: a.url,
      image: a.image,
      source: a.source,
      publishedAt: a.publishedAt
    }));

    const general = [...liveMapped, ...curated].slice(0, 16);
    const tickerSet = new Set(holdingsTickers.map((t) => t.toUpperCase()));
    const personalized = general.filter((article) => {
      if (article.category === 'holdings') return true;
      if (article.tickers?.some((t) => tickerSet.has(t.toUpperCase()))) return true;
      const hay = `${article.title} ${article.summary}`.toUpperCase();
      return [...tickerSet].some((t) => t.length >= 2 && hay.includes(t));
    });

    // Seed personalized headlines for common holdings when live filter is empty
    const seeded = holdingsTickers.slice(0, 4).map((ticker, i) => ({
      id: `holding-${ticker}-${i}`,
      category: 'holdings' as const,
      title: `${ticker}: flows and analyst chatter in focus`,
      summary: `Personalized desk note for your ${ticker} holding — monitor earnings, guidance, and sector peers.`,
      url: '#',
      source: 'Finlo Personalized',
      publishedAt: new Date(Date.now() - i * 5400000).toISOString(),
      tickers: [ticker],
      image: null
    }));

    const payload = {
      general,
      personalized: personalized.length ? personalized : seeded
    };
    InsightsCache.write(key, payload);
    return payload;
  }
};
