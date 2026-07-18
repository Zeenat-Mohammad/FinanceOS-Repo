import { lazy, Suspense } from 'react';
import { Card, LoadingState } from '@/shared/components';
import type { ForecastBundle } from '@/core/forecast';

const ForecastChartsInner = lazy(() => import('./ForecastChartsInner'));

export function ForecastCharts({ bundle, currency, showHistorical = true }: { bundle: ForecastBundle; currency: string; showHistorical?: boolean }) {
  return (
    <Suspense
      fallback={
        <Card>
          <LoadingState label="Loading forecast charts" />
        </Card>
      }
    >
      <ForecastChartsInner bundle={bundle} currency={currency} showHistorical={showHistorical} />
    </Suspense>
  );
}
