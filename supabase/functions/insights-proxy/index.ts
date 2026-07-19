// Unified Insights proxy — keeps API keys off the client.
// Deploy: supabase functions deploy insights-proxy
// Secrets: FINNHUB_API_KEY, ALPHA_VANTAGE_API_KEY, OCR_SPACE_API_KEY, NEWS_API_KEY (optional)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'ping');

    switch (action) {
      case 'ping':
        return json({ ok: true, service: 'insights-proxy' });
      case 'marketQuotes':
        return json(await marketQuotes(body.symbols ?? []));
      case 'cryptoQuotes':
        return json(await cryptoQuotes(body.ids ?? ['bitcoin', 'ethereum']));
      case 'news':
        return json(await fetchNews(body));
      case 'inflation':
        return json(await inflationSnapshot(body, admin));
      case 'marketOverview':
        return json(await marketOverview(admin));
      case 'economy':
        return json({ source: 'edge', country: body.country, note: 'Use curated EconomyRepository fallback when providers unavailable.' });
      case 'tax':
        return json({ source: 'edge', country: body.country, note: 'Tax aggregation reserved for provider wiring.' });
      case 'ocr':
        return json(await runOcr(body));
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Insights proxy failed' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

async function marketQuotes(symbols: string[]) {
  const key = Deno.env.get('FINNHUB_API_KEY');
  if (!key || !symbols.length) {
    return { source: 'unavailable', quotes: [] };
  }

  const quotes = await Promise.all(
    symbols.slice(0, 12).map(async (symbol) => {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`);
      if (!res.ok) return { symbol, error: true };
      const data = await res.json();
      return {
        symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc
      };
    })
  );

  return { source: 'finnhub', quotes };
}

async function cryptoQuotes(ids: string[]) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { source: 'unavailable', quotes: {} };
  const data = await res.json();
  return { source: 'coingecko', quotes: data };
}

async function fetchNews(body: { country?: string; category?: string; query?: string }) {
  const key = Deno.env.get('NEWS_API_KEY');
  if (!key) {
    return { source: 'unavailable', articles: [] };
  }

  const q = body.query || 'finance economy markets';
  const res = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=12&apiKey=${key}`
  );
  if (!res.ok) return { source: 'unavailable', articles: [] };
  const data = await res.json();
  return {
    source: 'newsapi',
    articles: (data.articles ?? []).map((a: Record<string, unknown>) => ({
      title: a.title,
      summary: a.description,
      url: a.url,
      image: a.urlToImage,
      source: (a.source as { name?: string } | undefined)?.name,
      publishedAt: a.publishedAt
    }))
  };
}

async function inflationSnapshot(
  body: { countryCode?: string; worldBankCode?: string },
  admin: ReturnType<typeof createClient>
) {
  const countryCode = String(body.countryCode ?? 'US').toUpperCase();
  const worldBankCode = String(body.worldBankCode ?? countryCode).toUpperCase();
  const cacheKey = `world-bank:${worldBankCode}`;
  const { data: cached } = await admin
    .from('inflation_cache')
    .select('payload')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (cached?.payload) return cached.payload;

  const currentYear = new Date().getUTCFullYear();
  const startYear = currentYear - 12;
  const response = await fetch(
    `https://api.worldbank.org/v2/country/${encodeURIComponent(worldBankCode)}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=100&date=${startYear}:${currentYear}`
  );
  if (!response.ok) return { source: 'unavailable', historical: [] };
  const raw = await response.json();
  const historical = (Array.isArray(raw) ? raw[1] ?? [] : [])
    .filter((row: Record<string, unknown>) => typeof row.value === 'number')
    .map((row: Record<string, unknown>) => ({ year: Number(row.date), rate: Number(Number(row.value).toFixed(4)) }))
    .sort((a: { year: number }, b: { year: number }) => a.year - b.year);
  if (!historical.length) return { source: 'unavailable', historical: [] };

  const recent = historical.slice(-5);
  const average = recent.reduce((sum: number, point: { rate: number }) => sum + point.rate, 0) / recent.length;
  const slope = recent.length > 1 ? (recent.at(-1).rate - recent[0].rate) / (recent.length - 1) : 0;
  const lastYear = historical.at(-1).year;
  const forecast = Array.from({ length: 5 }, (_, index) => ({
    year: lastYear + index + 1,
    rate: Number(Math.max(-2, Math.min(15, average + slope * (index + 1) * 0.35)).toFixed(4))
  }));
  const payload = {
    countryCode,
    currentRate: historical.at(-1).rate,
    historical,
    forecast,
    provider: 'World Bank',
    fetchedAt: new Date().toISOString(),
    isFallback: false
  };

  await admin.from('inflation_cache').upsert({
    cache_key: cacheKey,
    country_code: countryCode,
    provider: 'world_bank',
    current_rate: payload.currentRate,
    historical,
    forecast,
    payload,
    fetched_at: payload.fetchedAt,
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    last_error: null
  });
  return payload;
}

async function marketOverview(admin: ReturnType<typeof createClient>) {
  const cacheKey = 'market-overview:v1';
  const { data: cached } = await admin
    .from('market_cache')
    .select('payload')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (cached?.payload) return cached.payload;

  const symbols = ['^NSEI', '^BSESN', '^IXIC', '^GSPC', '^DJI', 'GC=F', 'SI=F', 'XLK', 'XLF', 'XLV', 'XLE'];
  const names: Record<string, string> = {
    '^NSEI': 'Nifty 50',
    '^BSESN': 'Sensex',
    '^IXIC': 'NASDAQ',
    '^GSPC': 'S&P 500',
    '^DJI': 'Dow Jones',
    'GC=F': 'Gold',
    'SI=F': 'Silver',
    XLK: 'Technology',
    XLF: 'Financials',
    XLV: 'Healthcare',
    XLE: 'Energy'
  };
  const yahoo = await fetch(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 Finlo/1.0', Accept: 'application/json' } }
  );
  const yahooJson = yahoo.ok ? await yahoo.json() : {};
  const allQuotes = (yahooJson?.quoteResponse?.result ?? []).map((quote: Record<string, unknown>) => ({
    symbol: String(quote.symbol ?? ''),
    name: names[String(quote.symbol ?? '')] ?? String(quote.shortName ?? quote.symbol ?? ''),
    price: Number(quote.regularMarketPrice ?? 0),
    change: Number(quote.regularMarketChange ?? 0),
    changePercent: Number(quote.regularMarketChangePercent ?? 0),
    currency: String(quote.currency ?? 'USD')
  }));

  const cryptoResponse = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
    { headers: { Accept: 'application/json' } }
  );
  const crypto = cryptoResponse.ok ? await cryptoResponse.json() : {};
  const fearResponse = await fetch('https://api.alternative.me/fng/?limit=1&format=json');
  const fear = fearResponse.ok ? await fearResponse.json() : {};
  const indices = allQuotes.filter((quote: { symbol: string }) => quote.symbol.startsWith('^'));
  const commodities = allQuotes.filter((quote: { symbol: string }) => quote.symbol.endsWith('=F'));
  const sectors = allQuotes
    .filter((quote: { symbol: string }) => quote.symbol.startsWith('XL'))
    .sort((a: { changePercent: number }, b: { changePercent: number }) => b.changePercent - a.changePercent);
  const ranked = [...indices, ...commodities].sort(
    (a: { changePercent: number }, b: { changePercent: number }) => b.changePercent - a.changePercent
  );
  const payload = {
    source: yahoo.ok ? 'Yahoo Finance, CoinGecko, Alternative.me' : 'CoinGecko, Alternative.me',
    fetchedAt: new Date().toISOString(),
    indices,
    commodities,
    crypto: [
      { symbol: 'BTC', name: 'Bitcoin', price: Number(crypto?.bitcoin?.usd ?? 0), changePercent: Number(crypto?.bitcoin?.usd_24h_change ?? 0), currency: 'USD' },
      { symbol: 'ETH', name: 'Ethereum', price: Number(crypto?.ethereum?.usd ?? 0), changePercent: Number(crypto?.ethereum?.usd_24h_change ?? 0), currency: 'USD' }
    ],
    topGainers: ranked.filter((quote: { changePercent: number }) => quote.changePercent > 0).slice(0, 3),
    topLosers: ranked.filter((quote: { changePercent: number }) => quote.changePercent < 0).sort((a: { changePercent: number }, b: { changePercent: number }) => a.changePercent - b.changePercent).slice(0, 3),
    trendingSectors: sectors.slice(0, 4),
    fearGreed: fear?.data?.[0]
      ? { value: Number(fear.data[0].value), label: String(fear.data[0].value_classification), source: 'Alternative.me crypto index' }
      : null
  };
  await admin.from('market_cache').upsert({
    cache_key: cacheKey,
    provider: payload.source,
    payload,
    fetched_at: payload.fetchedAt,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    last_error: null,
    request_count: 1
  });
  return payload;
}

async function runOcr(body: { imageBase64?: string; language?: string }) {
  const key = Deno.env.get('OCR_SPACE_API_KEY');
  if (!key || !body.imageBase64) {
    return {
      source: 'unavailable',
      text: '',
      parsed: null,
      message: 'Configure OCR_SPACE_API_KEY or use client-side demo parse.'
    };
  }

  const form = new FormData();
  form.append('base64Image', body.imageBase64.startsWith('data:') ? body.imageBase64 : `data:image/jpeg;base64,${body.imageBase64}`);
  form.append('language', body.language ?? 'eng');
  form.append('isOverlayRequired', 'false');
  form.append('OCREngine', '2');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: key },
    body: form
  });

  const data = await res.json();
  const text = data?.ParsedResults?.[0]?.ParsedText ?? '';
  return {
    source: 'ocr.space',
    text,
    confidence: 0.85,
    parsed: heuristicParseReceipt(text)
  };
}

function heuristicParseReceipt(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const amountMatch = text.match(/(?:total|amount|grand\s*total)[^\d]*(\d+[.,]\d{2})/i) ?? text.match(/(\d+[.,]\d{2})/);
  const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  const invoiceMatch = text.match(/(?:invoice|inv|bill)\s*[#:.]?\s*([A-Z0-9-]+)/i);
  return {
    merchant: lines[0] ?? null,
    invoice_number: invoiceMatch?.[1] ?? null,
    amount: amountMatch ? Number(amountMatch[1].replace(',', '.')) : null,
    tax_amount: null,
    currency: null,
    date: dateMatch?.[1] ?? null,
    items: lines.slice(1, 8),
    payment_method: /upi|card|cash|visa|mastercard/i.test(text) ? 'card/cash' : null
  };
}
