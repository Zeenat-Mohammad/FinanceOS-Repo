import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ForecastEngine,
  DEFAULT_ASSUMPTIONS,
  type ForecastBundle,
  type ForecastHorizon,
  type ForecastScenario,
  type ScenarioAssumptions,
  type WhatIfId
} from '@/core/forecast';
import { ForecastRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import type { ForecastWorkerRequest, ForecastWorkerResponse } from './forecast.worker';

function fingerprint(parts: {
  horizon: ForecastHorizon;
  scenario: ForecastScenario;
  whatIfs: WhatIfId[];
  assumptions: ScenarioAssumptions;
}) {
  return [
    parts.horizon,
    parts.scenario,
    parts.whatIfs.slice().sort().join(','),
    JSON.stringify(parts.assumptions)
  ].join('::');
}

function runOnMainThread(input: Parameters<typeof ForecastEngine.run>[0]): ForecastBundle {
  return ForecastEngine.run(input);
}

export function useForecast(params: {
  householdId?: string;
  userId?: string;
  horizon: ForecastHorizon;
  scenario: ForecastScenario;
  assumptions: ScenarioAssumptions;
  activeWhatIfs: WhatIfId[];
  refreshKey: number;
}) {
  const { householdId, userId, horizon, scenario, assumptions, activeWhatIfs, refreshKey } = params;

  const historyQuery = useQuery({
    queryKey: [...queryKeys.forecast.history(householdId ?? 'none'), refreshKey],
    queryFn: () => ForecastRepository.loadHistory(householdId!, userId!),
    enabled: Boolean(householdId && userId),
    staleTime: 60_000
  });

  const fp = fingerprint({ horizon, scenario, whatIfs: activeWhatIfs, assumptions });
  const [bundle, setBundle] = useState<ForecastBundle | null>(null);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const input = useMemo(() => {
    if (!historyQuery.data) return null;
    return {
      history: historyQuery.data.history,
      horizon,
      scenario,
      assumptions,
      activeWhatIfs,
      debtProjection: historyQuery.data.debtProjection,
      debtFreeDate: historyQuery.data.debtFreeDate,
      startingCashBalance: historyQuery.data.startingCashBalance,
      startingNetWorth: historyQuery.data.startingNetWorth,
      goals: historyQuery.data.goals
    };
  }, [historyQuery.data, horizon, scenario, assumptions, activeWhatIfs]);

  useEffect(() => {
    if (!input) return;

    const cacheKey = ForecastRepository.cacheKey(householdId ?? 'local', horizon, scenario, activeWhatIfs);
    try {
      const cached = sessionStorage.getItem(cacheKey + '::' + fp);
      if (cached) {
        setBundle(JSON.parse(cached) as ForecastBundle);
      }
    } catch {
      /* ignore */
    }

    setComputing(true);
    const requestId = `${Date.now()}-${Math.random()}`;

    let cancelled = false;
    const apply = (next: ForecastBundle) => {
      if (cancelled) return;
      setBundle(next);
      setComputing(false);
      try {
        sessionStorage.setItem(cacheKey + '::' + fp, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
    };

    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('./forecast.worker.ts', import.meta.url), { type: 'module' });
      }
      const worker = workerRef.current;
      const onMessage = (event: MessageEvent<ForecastWorkerResponse>) => {
        if (event.data.id !== requestId) return;
        if (event.data.ok) apply(event.data.bundle);
        else apply(runOnMainThread(input));
      };
      worker.addEventListener('message', onMessage);
      const payload: ForecastWorkerRequest = { id: requestId, input };
      worker.postMessage(payload);
      return () => {
        cancelled = true;
        worker.removeEventListener('message', onMessage);
      };
    } catch {
      apply(runOnMainThread(input));
      return () => {
        cancelled = true;
      };
    }
  }, [input, fp, householdId, horizon, scenario, activeWhatIfs]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return {
    historyQuery,
    bundle,
    computing: computing || historyQuery.isLoading,
    fingerprint: fp
  };
}

export { DEFAULT_ASSUMPTIONS };
