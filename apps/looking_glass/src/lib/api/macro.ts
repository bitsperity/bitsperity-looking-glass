import { apiGet, ApiError, apiPollJob } from './client';

export type MacroObs = { date: string; value: number };

export async function getSeries(series_id: string, from: string, to: string) {
  try {
    return await apiGet<{ items: MacroObs[] }>(`/v1/macro/fred/series/${series_id}?from=${from}&to=${to}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 202 && e.body?.job_id) {
      await apiPollJob(e.body.job_id);
      return await apiGet<{ items: MacroObs[] }>(`/v1/macro/fred/series/${series_id}?from=${from}&to=${to}`);
    }
    throw e;
  }
}

