# Finlo Insights Module

Unified financial intelligence center at `/insights` (replaces Forecast nav).

## Architecture

Single scrollable page with jump links:

1. Country Overview
2. Investment Portfolio
3. Economic Indicators
4. Inflation Dashboard
5. Interest Rates
6. Tax Center
7. Market News (+ personalized holdings news)
8. Receipt OCR
9. AI Insights

## Data layer

| Repository | Role | Cache |
|---|---|---|
| `MarketRepository` | Quotes via edge / curated | 15m |
| `EconomyRepository` | Inflation, GDP, commodities | 12h |
| `TaxRepository` | Country tax desk | 12h |
| `NewsRepository` | Market + personalized | 30m |
| `ExchangeRepository` | FX via Frankfurter | 15m |
| `InvestmentRepository` | Holdings + portfolio math | local/DB |
| `OCRRepository` | Scan + storage + receipt_images | none |

All external provider keys live in Supabase Edge Function `insights-proxy`.

## Edge function

```bash
supabase functions deploy insights-proxy
supabase secrets set FINNHUB_API_KEY=... OCR_SPACE_API_KEY=... NEWS_API_KEY=...
```

Actions: `marketQuotes`, `cryptoQuotes`, `news`, `economy`, `tax`, `ocr`.

## Migration

Apply `supabase/migrations/0009_insights_module.sql`:

- `profiles.insights_country`
- `investment_holdings`
- `investment_transactions`
- `receipt_images` (+ GIN search)
- receipts storage bucket

## Security

- RLS on all new tables via `is_household_member`
- Private storage for receipts
- No Vite secrets for OCR/news/market providers
- OCR uploads validate through authenticated edge + storage policies

## Future extensions

- Live Finnhub websockets
- Brokerage import (Plaid / SnapTrade)
- Push alerts for rate/inflation thresholds
- Full forecast charts embedded as an Insights sub-panel
- Receipt full-text search UI
