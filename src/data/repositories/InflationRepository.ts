import { invokeInsightsProxy } from './insights/invokeInsightsProxy';
import type { InflationSnapshot } from '@/types/intelligence';

const COUNTRY_TO_WB: Record<string, string> = {
  US: 'USA',
  IN: 'IND',
  GB: 'GBR',
  CA: 'CAN',
  AU: 'AUS',
  DE: 'DEU',
  FR: 'FRA',
  SG: 'SGP',
  AE: 'ARE',
  JP: 'JPN'
};

function fallback(countryCode: string): InflationSnapshot {
  const currentYear = new Date().getFullYear();
  const baseline = countryCode === 'IN' ? 4.5 : 3;
  return {
    countryCode,
    currentRate: baseline,
    historical: Array.from({ length: 8 }, (_, index) => ({
      year: currentYear - 8 + index,
      rate: Number((baseline + Math.sin(index * 1.4) * 1.2).toFixed(2))
    })),
    forecast: Array.from({ length: 5 }, (_, index) => ({
      year: currentYear + index,
      rate: Number(Math.max(1.5, baseline - index * 0.15).toFixed(2))
    })),
    provider: 'Finlo scenario fallback',
    fetchedAt: new Date().toISOString(),
    isFallback: true
  };
}

export const InflationRepository = {
  async getSnapshot(countryCode: string): Promise<InflationSnapshot> {
    const normalized = countryCode.toUpperCase();
    try {
      const data = await invokeInsightsProxy<Partial<InflationSnapshot>>('inflation', {
        countryCode: normalized,
        worldBankCode: COUNTRY_TO_WB[normalized] ?? normalized
      });
      if (!data?.historical?.length || typeof data.currentRate !== 'number') return fallback(normalized);
      return {
        countryCode: normalized,
        currentRate: data.currentRate,
        historical: data.historical,
        forecast: data.forecast?.length ? data.forecast : fallback(normalized).forecast,
        provider: data.provider ?? 'World Bank',
        fetchedAt: data.fetchedAt ?? new Date().toISOString(),
        isFallback: false
      };
    } catch {
      return fallback(normalized);
    }
  },

  futureValue(principal: number, annualReturnPct: number, years: number, monthlyContribution = 0) {
    const monthlyRate = annualReturnPct / 100 / 12;
    const months = Math.max(0, Math.round(years * 12));
    const principalValue = principal * (1 + monthlyRate) ** months;
    const contributionValue = monthlyRate
      ? monthlyContribution * (((1 + monthlyRate) ** months - 1) / monthlyRate)
      : monthlyContribution * months;
    return principalValue + contributionValue;
  },

  purchasingPower(nominalAmount: number, annualInflationPct: number, years: number) {
    return nominalAmount / (1 + annualInflationPct / 100) ** years;
  },

  inflatedCost(currentCost: number, annualInflationPct: number, years: number) {
    return currentCost * (1 + annualInflationPct / 100) ** years;
  },

  realValue(nominalAmount: number, annualInflationPct: number, months: number) {
    return nominalAmount / (1 + annualInflationPct / 100) ** (months / 12);
  }
};

