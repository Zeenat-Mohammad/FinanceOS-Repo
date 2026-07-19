import { useMemo, useState } from 'react';
import { LineChart, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, LoadingState, Page } from '@/shared/components';
import { COUNTRY_OPTIONS } from '@/core/locale/options';
import { resolveInsightsCountry } from '@/core/insights/countryPacks';
import { TransactionsRepository } from '@/data/repositories/TransactionsRepository';
import { CountrySummary, GlassPanel } from './components/CountrySummary';
import { AskFinloWidget } from './components/AskFinloWidget';
import {
  AIInsights,
  EconomicIndicators,
  InflationDashboard,
  InterestRateDashboard,
  MarketNews,
  ReceiptScannerSection,
  TaxCenter
} from './components/InsightSections';
import { useInsightsBundle, useSaveInsightsCountry, useSaveReceipt, useScanReceipt } from './useInsights';
import type { OcrReceiptResult } from '@/types/insights';
import { toAppError } from '@/shared/errors';

const JUMP_LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#news', label: 'News' },
  { href: '#economy', label: 'Economy' },
  { href: '#inflation', label: 'Inflation' },
  { href: '#rates', label: 'Rates' },
  { href: '#tax', label: 'Tax' },
  { href: '#ai', label: 'AI Assistant' },
  { href: '#ocr', label: 'Receipt OCR' }
];

export default function InsightsPage() {
  const { user, profile, household, setAuthContext } = useAuthStore();
  const country = resolveInsightsCountry(profile?.country, profile?.insights_country);
  const needsCountry = !country;
  const [draftCountry, setDraftCountry] = useState('IN');
  const [ocrResult, setOcrResult] = useState<OcrReceiptResult | null>(null);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const bundleQuery = useInsightsBundle({
    householdId: household?.id,
    userId: user?.id,
    profile,
    enabled: !needsCountry
  });
  const saveCountry = useSaveInsightsCountry();
  const scanReceipt = useScanReceipt();
  const saveReceipt = useSaveReceipt();

  const currency = household?.default_currency ?? profile?.currency ?? bundleQuery.data?.currency ?? 'USD';

  const receiptPreview = useMemo(() => {
    if (!ocrResult) return null;
    return (
      <GlassPanel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Merchant" value={ocrResult.merchant ?? ''} onChange={(v) => setOcrResult({ ...ocrResult, merchant: v })} />
          <Field label="Invoice #" value={ocrResult.invoice_number ?? ''} onChange={(v) => setOcrResult({ ...ocrResult, invoice_number: v })} />
          <Field label="Amount" value={String(ocrResult.amount ?? '')} onChange={(v) => setOcrResult({ ...ocrResult, amount: Number(v) || null })} />
          <Field label="Tax" value={String(ocrResult.tax_amount ?? '')} onChange={(v) => setOcrResult({ ...ocrResult, tax_amount: Number(v) || null })} />
          <Field label="Date" value={ocrResult.date ?? ''} onChange={(v) => setOcrResult({ ...ocrResult, date: v })} />
          <Field label="Payment" value={ocrResult.payment_method ?? ''} onChange={(v) => setOcrResult({ ...ocrResult, payment_method: v })} />
        </div>
        <p className="text-xs text-muted">Confidence {(ocrResult.confidence * 100).toFixed(0)}% · edit before saving</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={saveReceipt.isPending || !ocrFile || !household || !user}
            onClick={async () => {
              if (!ocrFile || !household || !user || !ocrResult) return;
              setOcrError(null);
              setOcrMessage(null);
              try {
                let transactionId: string | null = null;
                if (ocrResult.amount && household) {
                  const accounts = await import('@/data/repositories/AccountsRepository').then((m) => m.AccountsRepository.list());
                  const accountId = accounts[0]?.id;
                  if (accountId) {
                    const tx = await TransactionsRepository.create({
                      household_id: household.id,
                      user_id: user.id,
                      account_id: accountId,
                      amount: Math.abs(ocrResult.amount),
                      type: 'expense',
                      date: ocrResult.date || new Date().toISOString().slice(0, 10),
                      merchant: ocrResult.merchant,
                      description: ocrResult.merchant || 'Receipt expense',
                      notes: `OCR invoice ${ocrResult.invoice_number ?? ''}`.trim(),
                      tags: ['receipt-ocr']
                    });
                    transactionId = tx.id;
                  }
                }
                await saveReceipt.mutateAsync({
                  householdId: household.id,
                  userId: user.id,
                  file: ocrFile,
                  result: { ...ocrResult, currency: ocrResult.currency || currency },
                  transactionId
                });
                setOcrMessage(transactionId ? 'Receipt saved and transaction created.' : 'Receipt saved.');
                setOcrResult(null);
                setOcrFile(null);
              } catch (err) {
                setOcrError(toAppError(err).userMessage);
              }
            }}
          >
            {saveReceipt.isPending ? 'Saving…' : 'Save Transaction'}
          </Button>
          <Button className="border border-border bg-transparent text-foreground" onClick={() => { setOcrResult(null); setOcrFile(null); }}>
            Discard
          </Button>
        </div>
        {ocrMessage ? <p className="text-sm text-[var(--color-accent-green)]">{ocrMessage}</p> : null}
        {ocrError ? <p className="text-sm text-destructive">{ocrError}</p> : null}
      </GlassPanel>
    );
  }, [ocrResult, ocrFile, household, user, currency, saveReceipt, ocrMessage, ocrError]);

  if (!user || !household) return <LoadingState label="Loading Financial News & AI" />;

  if (needsCountry) {
    return (
      <Page>
        <GlassPanel className="mx-auto max-w-lg space-y-4">
          <h1 className="text-xl font-semibold">Choose your news region</h1>
          <p className="text-sm text-muted">We ask once. This drives inflation, rates, tax news, and market context.</p>
          <select className="select" value={draftCountry} onChange={(e) => setDraftCountry(e.target.value)}>
            {COUNTRY_OPTIONS.filter((c) => c.code !== 'OTHER').map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <Button
            disabled={saveCountry.isPending}
            onClick={async () => {
              const updated = await saveCountry.mutateAsync({ userId: user.id, country: draftCountry });
              setAuthContext({ user, profile: updated, household });
            }}
          >
            {saveCountry.isPending ? 'Saving…' : 'Continue'}
          </Button>
        </GlassPanel>
      </Page>
    );
  }

  if (bundleQuery.isLoading || !bundleQuery.data) {
    return <LoadingState label="Loading financial news and AI assistant" />;
  }

  const bundle = bundleQuery.data;

  return (
    <Page className="space-y-10 pb-16">
      <header className="insights-glass relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(58,157,157,0.22),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(180,167,214,0.18),transparent_40%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-white/5 px-3 py-1 text-xs text-muted">
              <LineChart className="h-3.5 w-3.5 text-[var(--color-accent-teal)]" />
              Financial News & AI
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Financial News & AI</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Headlines, macro context, tax updates, and Finlo AI — tailored for{' '}
              <span className="text-foreground">{bundle.country}</span> · {currency}. Portfolio tracking lives in{' '}
              <a href="/net-worth" className="text-accent hover:underline">Investments & Net Worth</a>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="border border-border bg-transparent text-foreground" onClick={() => void bundleQuery.refetch()}>
              <RefreshCw className={`h-4 w-4 ${bundleQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <nav className="relative mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Financial News sections">
          {JUMP_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full border border-border/40 bg-white/5 px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <div id="overview">
        <CountrySummary indicators={bundle.economy.indicators} currency={currency} />
      </div>

      <div id="news">
        <MarketNews news={bundle.news} personalized={bundle.personalizedNews} />
      </div>

      <div id="ai">
        <AskFinloWidget />
      </div>

      <EconomicIndicators economy={bundle.economy} />
      <InflationDashboard economy={bundle.economy} currency={currency} />
      <InterestRateDashboard economy={bundle.economy} />
      <TaxCenter tax={bundle.tax} />

      <div id="ocr">
        <ReceiptScannerSection
          busy={scanReceipt.isPending}
          preview={receiptPreview}
          onPick={async (file) => {
            setOcrError(null);
            setOcrMessage(null);
            setOcrFile(file);
            try {
              const result = await scanReceipt.mutateAsync(file);
              setOcrResult({ ...result, currency: result.currency || currency });
            } catch (err) {
              setOcrError(toAppError(err).userMessage);
            }
          }}
        />
      </div>

      <AIInsights insights={bundle.aiInsights} />

      <GlassPanel className="text-xs text-muted">
        News cache 30m · Economy/Tax 12h · OCR never cached. Secrets stay in Supabase Edge Function{' '}
        <code className="text-foreground">insights-proxy</code>.
      </GlassPanel>
    </Page>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs">
      <span className="text-muted">{label}</span>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
