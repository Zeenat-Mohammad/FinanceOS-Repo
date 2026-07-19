import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Flame, ShieldCheck } from 'lucide-react';
import { InflationRepository } from '@/data/repositories/InflationRepository';
import { queryKeys } from '@/data/query-keys';
import { formatCurrency } from '@/core/utils/currency';
import type { ForecastBundle } from '@/core/forecast';
import { Card, LoadingState } from '@/shared/components';

export function InflationPanel({ bundle, countryCode, currency }: { bundle: ForecastBundle; countryCode: string; currency: string }) {
  const query = useQuery({
    queryKey: queryKeys.inflation.snapshot(countryCode),
    queryFn: () => InflationRepository.getSnapshot(countryCode),
    staleTime: 12 * 60 * 60 * 1000
  });
  const chart = useMemo(() => {
    const rate = query.data?.currentRate ?? bundle.assumptions.inflationRate;
    return bundle.netWorth.forecast.map((point, index) => ({
      label: point.label,
      current: point.value,
      inflationAdjusted: InflationRepository.realValue(point.value, rate, index + 1)
    }));
  }, [bundle, query.data?.currentRate]);

  if (query.isLoading || !query.data) return <LoadingState label="Loading inflation intelligence" />;
  const inflation = query.data;
  const years = bundle.horizon / 12;
  const nominalSavings = bundle.savings.forecast.at(-1)?.value ?? 0;
  const investment = bundle.investments.forecast.at(-1)?.value ?? 0;
  const retirementCost = InflationRepository.inflatedCost(bundle.overview.currentCashBalance * 12, inflation.currentRate, Math.max(10, years));

  return (
    <section className="space-y-4" aria-labelledby="inflation-panel-title">
      <div className="flex items-end justify-between gap-3"><div><h2 id="inflation-panel-title" className="text-lg font-semibold text-foreground">Inflation Forecast</h2><p className="mt-1 text-sm text-muted">Nominal forecasts compared with purchasing-power-adjusted values.</p></div><span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">{inflation.provider}{inflation.isFallback ? ' · fallback' : ''}</span></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Current inflation" value={`${inflation.currentRate.toFixed(2)}%`} icon={<Flame className="h-4 w-4" />} />
        <Metric label="Historical average" value={`${average(inflation.historical.map((point) => point.rate)).toFixed(2)}%`} icon={<ShieldCheck className="h-4 w-4" />} />
        <Metric label="Forecast inflation" value={`${average(inflation.forecast.map((point) => point.rate)).toFixed(2)}%`} icon={<Flame className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8"><h3 className="text-sm font-semibold text-foreground">Forecast with and without inflation</h3><div className="mt-3 h-72"><ResponsiveContainer><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} /><YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} /><Tooltip formatter={(value: number) => formatCurrency(value, currency)} /><Legend /><Area type="monotone" name="Current / nominal" dataKey="current" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.12} strokeWidth={2.5} /><Area type="monotone" name="Inflation adjusted" dataKey="inflationAdjusted" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div></Card>
        <Card className="xl:col-span-4"><h3 className="text-sm font-semibold text-foreground">Historical & forecast rate</h3><div className="mt-3 h-72"><ResponsiveContainer><LineChart data={[...inflation.historical.map((point) => ({ ...point, kind: 'Historical' })), ...inflation.forecast.map((point) => ({ ...point, kind: 'Forecast' }))]}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="year" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} /><YAxis unit="%" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="rate" stroke="#b4a7d6" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Calc label="Investment future value" value={formatCurrency(investment, currency)} hint="Forecast nominal value" />
        <Calc label="Inflation-adjusted savings" value={formatCurrency(InflationRepository.purchasingPower(nominalSavings, inflation.currentRate, years), currency)} hint={`${years.toFixed(1)} year purchasing power`} />
        <Calc label="Cash purchasing power" value={formatCurrency(InflationRepository.purchasingPower(bundle.overview.projectedCashBalance, inflation.currentRate, years), currency)} hint="Projected cash in today's money" />
        <Calc label="Goal cost inflation" value={formatCurrency(InflationRepository.inflatedCost(bundle.goals.reduce((sum, goal) => sum + goal.target, 0), inflation.currentRate, years), currency)} hint="Combined target cost" />
        <Calc label="Retirement inflation" value={formatCurrency(retirementCost, currency)} hint="Illustrative annual cost in 10+ years" />
      </div>
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <Card><div className="flex items-center justify-between text-sm text-muted"><span>{label}</span><span className="text-accent">{icon}</span></div><div className="mt-2 text-2xl font-semibold text-foreground">{value}</div></Card>;
}

function Calc({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <Card><div className="text-xs text-muted">{label}</div><div className="mt-2 text-lg font-semibold text-foreground">{value}</div><div className="mt-1 text-[11px] text-muted">{hint}</div></Card>;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

