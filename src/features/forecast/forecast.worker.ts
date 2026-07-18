import { ForecastEngine, type ForecastInput, type ForecastBundle } from '@/core/forecast';

export type ForecastWorkerRequest = {
  id: string;
  input: ForecastInput;
};

export type ForecastWorkerResponse = {
  id: string;
  ok: true;
  bundle: ForecastBundle;
} | {
  id: string;
  ok: false;
  error: string;
};

self.onmessage = (event: MessageEvent<ForecastWorkerRequest>) => {
  const { id, input } = event.data;
  try {
    const bundle = ForecastEngine.run(input);
    const response: ForecastWorkerResponse = { id, ok: true, bundle };
    self.postMessage(response);
  } catch (error) {
    const response: ForecastWorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'Forecast failed'
    };
    self.postMessage(response);
  }
};
