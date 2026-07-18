import { formatCurrency } from '@/core/utils/currency';

export type FxRates = {
  base: string;
  date: string;
  rates: Record<string, number>;
  source: 'frankfurter' | 'fallback';
};

const CACHE_PREFIX = 'finlo.fx.';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const FALLBACK_RATES_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  AED: 3.67,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 151,
  CHF: 0.88,
  SGD: 1.34,
  CNY: 7.25,
  HKD: 7.8,
  NZD: 1.64,
  SEK: 10.45,
  NOK: 10.65,
  DKK: 6.86,
  ZAR: 18.2,
  BRL: 5.45,
  MXN: 18.1,
  TRY: 33.1,
  PLN: 3.95,
  THB: 36.4,
  MYR: 4.7,
  PHP: 58.3,
  IDR: 16250,
  KRW: 1380,
  ILS: 3.7,
  CZK: 23.2,
  HUF: 360,
  RON: 4.58
};

function readCache(base: string): FxRates | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + base);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FxRates & { cachedAt: number };
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return { base: parsed.base, date: parsed.date, rates: parsed.rates, source: parsed.source };
  } catch {
    return null;
  }
}

function writeCache(rates: FxRates) {
  try {
    localStorage.setItem(CACHE_PREFIX + rates.base, JSON.stringify({ ...rates, cachedAt: Date.now() }));
  } catch {
    // ignore quota
  }
}

function normalizeCurrency(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
}

/** rates are quoted as: 1 `base` = rates[code] units of `code`. */
function convertWithRates(amount: number, from: string, to: string, rates: Record<string, number>, base: string) {
  const f = normalizeCurrency(from);
  const t = normalizeCurrency(to);
  if (!f || !t || f === t) return amount;

  const fromRate = f === base ? 1 : rates[f];
  const toRate = t === base ? 1 : rates[t];
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) return null;

  const amountInBase = amount / fromRate;
  return amountInBase * toRate;
}

export const FxRepository = {
  async getRates(baseCurrency: string): Promise<FxRates> {
    const base = normalizeCurrency(baseCurrency) || 'USD';
    const cached = readCache(base);
    if (cached) return cached;

    try {
      // Frankfurter — free ECB rates, no API key
      const response = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`FX HTTP ${response.status}`);
      const json = (await response.json()) as { base?: string; date?: string; rates?: Record<string, number> };
      const rates = { ...(json.rates ?? {}), [base]: 1 };
      const payload: FxRates = {
        base: normalizeCurrency(json.base ?? base),
        date: json.date ?? new Date().toISOString().slice(0, 10),
        rates,
        source: 'frankfurter'
      };
      writeCache(payload);
      return payload;
    } catch {
      // Fallback: static USD table, convert via USD
      const usdRates = { ...FALLBACK_RATES_USD };
      if (base === 'USD') {
        const payload: FxRates = {
          base: 'USD',
          date: new Date().toISOString().slice(0, 10),
          rates: usdRates,
          source: 'fallback'
        };
        writeCache(payload);
        return payload;
      }

      // Build rates relative to requested base from USD table
      const usdPerBase = usdRates[base];
      if (!usdPerBase) {
        return {
          base: 'USD',
          date: new Date().toISOString().slice(0, 10),
          rates: usdRates,
          source: 'fallback'
        };
      }

      const relative: Record<string, number> = { [base]: 1 };
      for (const [code, usdRate] of Object.entries(usdRates)) {
        // 1 base = (1/usdPerBase) USD = usdRate/usdPerBase of code
        relative[code] = usdRate / usdPerBase;
      }
      const payload: FxRates = {
        base,
        date: new Date().toISOString().slice(0, 10),
        rates: relative,
        source: 'fallback'
      };
      writeCache(payload);
      return payload;
    }
  },

  convert(amount: number, from: string, to: string, fx: FxRates): number | null {
    const direct = convertWithRates(amount, from, to, fx.rates, fx.base);
    if (direct != null) return direct;

    // Fill gaps (e.g. AED) via static USD table when live rates omit a code
    const fromCode = normalizeCurrency(from);
    const toCode = normalizeCurrency(to);
    const usdFrom = fromCode === 'USD' ? 1 : (fx.rates[fromCode] ?? FALLBACK_RATES_USD[fromCode]);
    const usdTo = toCode === 'USD' ? 1 : (fx.rates[toCode] ?? FALLBACK_RATES_USD[toCode]);
    // If fx.base is not USD, rates are relative to fx.base — prefer re-fetch path
    if (fx.base === 'USD' && usdFrom && usdTo) {
      return (amount / usdFrom) * usdTo;
    }
    if (FALLBACK_RATES_USD[fromCode] && FALLBACK_RATES_USD[toCode]) {
      return (amount / FALLBACK_RATES_USD[fromCode]) * FALLBACK_RATES_USD[toCode];
    }
    return null;
  },

  formatConverted(amount: number, currency: string) {
    return formatCurrency(amount, currency);
  },

  popularTargets(base: string) {
    const preferred = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD', 'JPY', 'CHF', 'SGD'];
    const b = normalizeCurrency(base);
    return preferred.filter((c) => c !== b);
  }
};
