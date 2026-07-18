import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data/query-keys';
import {
  EconomyRepository,
  InvestmentRepository,
  NewsRepository,
  OCRRepository,
  TaxRepository
} from '@/data/repositories/insights';
import { ProfileRepository } from '@/data/repositories/ProfileRepository';
import { InsightEngine } from '@/core/insights/InsightEngine';
import { defaultCurrencyForCountry, resolveInsightsCountry } from '@/core/insights/countryPacks';
import type { InsightsBundle, OcrReceiptResult } from '@/types/insights';
import type { Profile } from '@/types/finance';

export function useInsightsBundle(params: {
  householdId?: string;
  userId?: string;
  profile?: Profile | null;
  enabled?: boolean;
}) {
  const country = resolveInsightsCountry(params.profile?.country, params.profile?.insights_country) ?? 'US';

  return useQuery({
    queryKey: queryKeys.insights.bundle(params.householdId ?? 'none', country),
    enabled: Boolean(params.householdId && params.userId && (params.enabled ?? true)),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<InsightsBundle> => {
      const currency = params.profile?.currency || defaultCurrencyForCountry(country);
      const [economy, tax, holdingsRaw] = await Promise.all([
        EconomyRepository.getSnapshot(country),
        TaxRepository.getCenter(country),
        InvestmentRepository.list(params.householdId!, params.userId!, currency)
      ]);

      const holdings = await InvestmentRepository.refreshPrices(holdingsRaw);
      const portfolio = InvestmentRepository.summarize(holdings);
      const tickers = holdings.map((h) => h.ticker).filter((t): t is string => Boolean(t));
      const news = await NewsRepository.list(country, tickers);
      const aiInsights = InsightEngine.build({
        economy,
        holdings,
        portfolio,
        debtAprPct: 18,
        portfolioReturnPct: portfolio.annualReturnPct,
        monthlyFoodSpend: 1200,
        previousFoodSpend: 1015,
        subscriptionSpend: 45,
        subscriptionBudget: 30
      });

      return {
        country,
        currency,
        economy,
        tax,
        news: news.general,
        personalizedNews: news.personalized,
        portfolio,
        holdings,
        aiInsights
      };
    }
  });
}

export function useSaveInsightsCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, country }: { userId: string; country: string }) => {
      return ProfileRepository.updateProfile(userId, {
        country,
        insights_country: country
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['insights'] });
    }
  });
}

export function useScanReceipt() {
  return useMutation({
    mutationFn: async (file: File) => OCRRepository.scanReceipt(file)
  });
}

export function useSaveReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      householdId: string;
      userId: string;
      file: File;
      result: OcrReceiptResult;
      transactionId?: string | null;
    }) => OCRRepository.uploadAndSave(params),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.insights.receipts(vars.householdId, '') });
    }
  });
}
