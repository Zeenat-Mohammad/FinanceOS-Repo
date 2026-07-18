import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Card } from '@/shared/components';
import { FxRepository } from '@/data/repositories/FxRepository';
import { cn } from '@/core/utils/cn';

export function CurrencyConverter({ baseCurrency }: { baseCurrency: string }) {
  const base = (baseCurrency || 'USD').toUpperCase();
  const [amount, setAmount] = useState('100');
  const [target, setTarget] = useState(() => FxRepository.popularTargets(base)[0] ?? 'EUR');

  const ratesQuery = useQuery({
    queryKey: ['fx', 'rates', base],
    queryFn: () => FxRepository.getRates(base),
    staleTime: 30 * 60_000,
    retry: 1
  });

  const targets = useMemo(() => {
    const fromApi = Object.keys(ratesQuery.data?.rates ?? {})
      .filter((c) => c !== base)
      .sort();
    const preferred = FxRepository.popularTargets(base);
    const merged = [...preferred, ...fromApi.filter((c) => !preferred.includes(c))];
    return merged.length ? merged : ['EUR', 'USD', 'INR'];
  }, [ratesQuery.data, base]);

  // Keep target valid when base currency changes
  const effectiveTarget = targets.includes(target) ? target : targets[0];

  const numeric = Number(amount.replace(/,/g, ''));
  const converted =
    ratesQuery.data && Number.isFinite(numeric)
      ? FxRepository.convert(numeric, base, effectiveTarget, ratesQuery.data)
      : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Currency converter</h2>
          <p className="mt-0.5 text-xs text-muted">
            Based on your selected currency ({base})
            {ratesQuery.data ? ` · rates ${ratesQuery.data.date}` : null}
            {ratesQuery.data?.source === 'fallback' ? ' · offline fallback' : null}
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh rates"
          className="rounded-md border border-border p-2 text-muted hover:text-foreground"
          onClick={() => void ratesQuery.refetch()}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', ratesQuery.isFetching && 'animate-spin')} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-muted">Amount ({base})</span>
          <input
            className="input mt-1"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount to convert"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Convert to</span>
          <select
            className="select mt-1"
            value={effectiveTarget}
            onChange={(e) => setTarget(e.target.value)}
          >
            {targets.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-brand border border-border/60 bg-primary/40 px-3 py-3">
        {ratesQuery.isLoading ? (
          <p className="text-sm text-muted">Loading exchange rates…</p>
        ) : ratesQuery.isError && !ratesQuery.data ? (
          <p className="text-sm text-destructive">Could not load live rates. Try refresh.</p>
        ) : converted == null ? (
          <p className="text-sm text-muted">Enter a valid amount.</p>
        ) : (
          <p className="text-sm text-foreground">
            <span className="font-semibold tabular-nums">{FxRepository.formatConverted(numeric, base)}</span>
            <span className="mx-2 text-muted">≈</span>
            <span className="text-lg font-semibold tabular-nums text-accent">
              {FxRepository.formatConverted(converted, effectiveTarget)}
            </span>
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted">
          Live rates via Frankfurter (ECB). Cached for one hour. Not financial advice.
        </p>
      </div>
    </Card>
  );
}
