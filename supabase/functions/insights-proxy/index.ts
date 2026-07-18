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
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const invoiceMatch = text.match(/(?:invoice|inv|bill)\s*[#:.]?\s*([A-Z0-9\-]+)/i);
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
