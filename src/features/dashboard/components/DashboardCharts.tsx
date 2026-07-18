import { lazy, Suspense, useState } from 'react';
import { Card, LoadingState } from '@/shared/components';
import type { ForecastBundle } from '@/core/forecast';

const ChartsInner = lazy(() => import('./DashboardChartsInner'));

export function DashboardCharts({
  cashFlowHistory,
  categoryBreakdown,
  netWorthSeries,
  currency
}: {
  cashFlowHistory: Array<{ label: string; income: number; expenses: number; net: number }>;
  categoryBreakdown: Array<{ name: string; value: number; color: string }>;
  netWorthSeries: ForecastBundle['netWorth'] | null;
  currency: string;
}) {
  const [range, setRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M');

  return (
    <Suspense
      fallback={
        <Card>
          <LoadingState label="Loading charts" />
        </Card>
      }
    >
      <ChartsInner
        cashFlowHistory={cashFlowHistory}
        categoryBreakdown={categoryBreakdown}
        netWorthSeries={netWorthSeries}
        currency={currency}
        range={range}
        onRangeChange={setRange}
      />
    </Suspense>
  );
}
