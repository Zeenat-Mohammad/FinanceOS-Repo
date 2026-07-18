import { lazy, Suspense } from 'react';
import { Card, LoadingState } from '@/shared/components';
import type { SimulationBundle } from '../useDebtSimulation';
import type { DebtAccount } from '@/types/debt';

const DebtChartsInner = lazy(() => import('./DebtChartsInner'));

export function DebtCharts({
  simulation,
  debts,
  currency
}: {
  simulation: SimulationBundle;
  debts: DebtAccount[];
  currency: string;
}) {
  return (
    <Suspense
      fallback={
        <Card>
          <LoadingState label="Loading charts" />
        </Card>
      }
    >
      <DebtChartsInner simulation={simulation} debts={debts} currency={currency} />
    </Suspense>
  );
}
