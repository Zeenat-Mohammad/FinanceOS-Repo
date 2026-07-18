import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, LoadingState } from '@/shared/components';
import type { ForecastBundle } from '@/core/forecast';
import type { CategoryChartDatum } from '@/shared/components/ResponsiveCategoryChart';

const ChartsInner = lazy(() => import('./DashboardChartsInner'));

export function DashboardCharts({
  cashFlowHistory,
  categoryBreakdown,
  netWorthSeries,
  currency
}: {
  cashFlowHistory: Array<{ label: string; income: number; expenses: number; net: number }>;
  categoryBreakdown: CategoryChartDatum[];
  netWorthSeries: ForecastBundle['netWorth'] | null;
  currency: string;
}) {
  const [range, setRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M');
  const navigate = useNavigate();

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
        onCategoryClick={(category) => navigate(`/transactions?category=${encodeURIComponent(category.id ?? category.name)}`)}
      />
    </Suspense>
  );
}
