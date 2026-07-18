import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { EconomySnapshot, TaxCenterContent, NewsArticle, AiInsightCard, InvestmentHolding } from '@/types/insights';
import { formatCurrency } from '@/core/utils/currency';
import { Button, EmptyState } from '@/shared/components';
import { GlassPanel, InsightsSection } from './CountrySummary';
import { ExternalLink, ScanLine, Sparkles } from 'lucide-react';
import { cn } from '@/core/utils/cn';

export function EconomicIndicators({ economy }: { economy: EconomySnapshot }) {
  return (
    <InsightsSection id="economy" title="Economic Indicators" subtitle={`Country pack for ${economy.country} · source ${economy.source}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Gold" value={economy.commodities.gold.toLocaleString()} />
        <MetricCard label="Silver" value={economy.commodities.silver.toLocaleString()} />
        <MetricCard label="Oil" value={economy.commodities.oil.toLocaleString()} />
        <MetricCard label="Fuel" value={economy.commodities.fuel.toLocaleString()} />
      </div>
    </InsightsSection>
  );
}

export function InflationDashboard({ economy, currency }: { economy: EconomySnapshot; currency: string }) {
  return (
    <InsightsSection id="inflation" title="Inflation Dashboard" subtitle="Historical trend, average, and household impact.">
      <div className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-8">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={economy.inflationSeries}>
                <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#b4a7d6" fill="#b4a7d6" fillOpacity={0.25} strokeWidth={2.5} isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
        <div className="grid gap-3 xl:col-span-4">
          <MetricCard label="Current inflation" value={`${economy.inflationCurrent.toFixed(1)}%`} />
          <MetricCard label="5Y / recent average" value={`${economy.inflationAverage5y.toFixed(1)}%`} />
          <MetricCard label="Forecast" value={`${economy.inflationForecast.toFixed(1)}%`} />
          <GlassPanel>
            <p className="text-xs uppercase tracking-wide text-muted">Impact</p>
            <p className="mt-2 text-sm text-foreground">{economy.inflationImpactNote}</p>
            <p className="mt-2 text-[11px] text-muted">Illustrated in {currency} purchasing power terms.</p>
          </GlassPanel>
        </div>
      </div>
    </InsightsSection>
  );
}

export function InterestRateDashboard({ economy }: { economy: EconomySnapshot }) {
  const rows = [
    { label: 'Central Bank Rate', value: economy.interest.centralBank },
    { label: 'Savings Rate', value: economy.interest.savings },
    { label: 'Mortgage Rate', value: economy.interest.mortgage },
    { label: 'Personal Loan Rate', value: economy.interest.personalLoan },
    { label: 'Credit Card Average', value: economy.interest.creditCard }
  ];
  return (
    <InsightsSection id="rates" title="Interest Rates" subtitle="Policy and consumer rate board for your country.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <MetricCard key={row.label} label={row.label} value={`${row.value.toFixed(1)}%`} />
        ))}
      </div>
    </InsightsSection>
  );
}

export function TaxCenter({ tax }: { tax: TaxCenterContent }) {
  return (
    <InsightsSection id="tax" title="Tax Center" subtitle={tax.title}>
      <div className="grid gap-4 xl:grid-cols-12">
        <GlassPanel className="xl:col-span-5">
          <h3 className="text-sm font-semibold">Topics</h3>
          <ul className="mt-3 space-y-2">
            {tax.topics.map((t) => (
              <li key={t.id} className="rounded-lg border border-border/50 bg-white/5 px-3 py-2">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted">{t.blurb}</p>
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel className="xl:col-span-3">
          <h3 className="text-sm font-semibold">Deadlines</h3>
          <ul className="mt-3 space-y-2">
            {tax.deadlines.map((d) => (
              <li key={d.id} className="text-sm">
                <span
                  className={cn(
                    'mr-2 inline-block h-2 w-2 rounded-full',
                    d.severity === 'critical' && 'bg-red-400',
                    d.severity === 'warn' && 'bg-amber-300',
                    d.severity === 'info' && 'bg-[var(--color-accent-teal)]'
                  )}
                />
                <span className="font-medium">{d.title}</span>
                <span className="block pl-4 text-xs text-muted">{d.date}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel className="xl:col-span-4">
          <h3 className="text-sm font-semibold">Tax-saving suggestions</h3>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted">
            {tax.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-sm font-semibold">Government updates</h3>
          <ul className="mt-2 space-y-2">
            {tax.news.map((n) => (
              <li key={n.id} className="text-sm">
                <a className="font-medium text-[var(--color-accent-teal)] hover:underline" href={n.url} target="_blank" rel="noreferrer">
                  {n.title}
                </a>
                <p className="text-xs text-muted">{n.summary}</p>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>
    </InsightsSection>
  );
}

export function MarketNews({
  news,
  personalized
}: {
  news: NewsArticle[];
  personalized: NewsArticle[];
}) {
  return (
    <InsightsSection id="news" title="Market News" subtitle="Economy, markets, crypto, government, and holdings-aware desk notes.">
      {!news.length ? (
        <EmptyState title="No news" message="Retry in a moment or check your edge function secrets." />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {news.slice(0, 9).map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Personalized for your holdings</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {personalized.slice(0, 6).map((article) => (
                <NewsCard key={article.id} article={article} highlight />
              ))}
            </div>
          </div>
        </>
      )}
    </InsightsSection>
  );
}

function NewsCard({ article, highlight }: { article: NewsArticle; highlight?: boolean }) {
  return (
    <GlassPanel className={cn(highlight && 'ring-1 ring-[var(--color-accent-purple)]/40')}>
      {article.image ? <img src={article.image} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" /> : null}
      <p className="text-[10px] uppercase tracking-wide text-muted">{article.category.replaceAll('_', ' ')}</p>
      <h4 className="mt-1 text-sm font-semibold leading-snug">{article.title}</h4>
      <p className="mt-2 line-clamp-3 text-xs text-muted">{article.summary}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span>
          {article.source} · {new Date(article.publishedAt).toLocaleString()}
        </span>
        <a className="inline-flex items-center gap-1 text-[var(--color-accent-teal)] hover:underline" href={article.url} target="_blank" rel="noreferrer">
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </GlassPanel>
  );
}

export function AIInsights({ insights }: { insights: AiInsightCard[] }) {
  return (
    <InsightsSection id="ai" title="AI Financial Insights" subtitle="Deterministic explanations — Finlo never invents opaque math.">
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((card) => (
          <GlassPanel key={card.id}>
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-[var(--color-accent-purple)]" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">{card.severity}</p>
                <h4 className="mt-1 text-sm font-semibold">{card.title}</h4>
                <p className="mt-2 text-xs text-muted">{card.explanation}</p>
                <p className="mt-2 text-sm text-foreground">
                  <span className="text-[var(--color-accent-green)]">Suggestion:</span> {card.suggestion}
                </p>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
    </InsightsSection>
  );
}

export function HoldingDrawer({
  holding,
  currency,
  onClose
}: {
  holding: InvestmentHolding | null;
  currency: string;
  onClose: () => void;
}) {
  if (!holding) return null;
  const m = InvestmentRepositoryCompat(holding);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <aside className="insights-glass h-full w-full max-w-md overflow-y-auto rounded-none border-l p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{holding.ticker}</p>
            <h2 className="text-lg font-semibold">{holding.name}</h2>
          </div>
          <Button className="border border-border bg-transparent text-foreground" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <MetricCard label="Value" value={formatCurrency(m.value, currency)} />
          <MetricCard label="Gain" value={formatCurrency(m.gain, currency)} />
          <MetricCard label="Qty" value={String(holding.quantity)} />
          <MetricCard label="Avg cost" value={formatCurrency(holding.average_cost, currency)} />
        </div>
        <div className="mt-5 space-y-3 text-sm text-muted">
          <p>
            <strong className="text-foreground">AI summary:</strong> Position sizing looks {m.gain >= 0 ? 'constructive' : 'under water'}. Review allocation before adding risk.
          </p>
          <p>
            <strong className="text-foreground">Dividend / income:</strong> Estimated yield contribution is tracked at portfolio level.
          </p>
          <p>
            <strong className="text-foreground">Latest news:</strong> Open Market News for ticker-matched headlines.
          </p>
        </div>
      </aside>
    </div>
  );
}

function InvestmentRepositoryCompat(holding: InvestmentHolding) {
  const price = holding.current_price ?? holding.average_cost;
  const value = holding.quantity * price;
  const cost = holding.quantity * holding.average_cost;
  return { value, cost, gain: value - cost };
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </GlassPanel>
  );
}

export function ReceiptScannerSection({
  onPick,
  busy,
  preview
}: {
  onPick: (file: File) => void;
  busy: boolean;
  preview: ReactNode;
}) {
  return (
    <InsightsSection
      id="ocr"
      title="Receipt OCR"
      subtitle="Scan → extract → review → save. Keys stay on the edge function."
      action={
        <label className="inline-flex cursor-pointer">
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.currentTarget.value = '';
            }}
          />
          <span className="inline-flex items-center gap-2 rounded-md bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-button-hover)]">
            <ScanLine className="h-4 w-4" />
            {busy ? 'Scanning…' : 'Scan Receipt'}
          </span>
        </label>
      }
    >
      {preview ?? (
        <EmptyState title="No receipts scanned" message="Scan your first receipt to extract merchant, tax, and line items." />
      )}
    </InsightsSection>
  );
}
