import { apiGet, ApiError } from './client';

export type MacroObs = { date: string; value: number; series_id: string };

export type FredSeries = {
  id: string;
  title: string;
  units: string;
  frequency: string;
  popularity: number;
  observation_start: string;
  observation_end: string;
};

export async function searchFredSeries(query: string, limit: number = 20) {
  return await apiGet<{ query: string; count: number; results: FredSeries[]; error?: string }>(`/v1/macro/fred/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function getSeries(series_id: string, from: string, to: string) {
  let retries = 0;
  const MAX_RETRIES = 5;
  
  while (retries < MAX_RETRIES) {
    try {
      return await apiGet<{ items: MacroObs[] }>(`/v1/macro/series/${series_id}?from=${from}&to=${to}&sync_timeout_s=2`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 202) {
        // Fetch-on-miss: data being fetched in background
        retries++;
        if (retries >= MAX_RETRIES) {
          throw new Error(`Timeout waiting for ${series_id} data after ${MAX_RETRIES} retries`);
        }
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw e;
    }
  }
  
  throw new Error(`Failed to fetch ${series_id} after ${MAX_RETRIES} retries`);
}

export async function getSeriesStatus(series_id: string) {
  return await apiGet<{
    series_id: string;
    observation_count: number;
    latest_date: string | null;
    latest_value: number | null;
    title: string | null;
    units: string | null;
    frequency: string | null;
    observation_start: string | null;
    observation_end: string | null;
  }>(`/v1/macro/status/${series_id}`);
}

export async function getCategories(category?: string) {
  const url = category 
    ? `/v1/macro/categories?category=${encodeURIComponent(category)}`
    : '/v1/macro/categories';
  return await apiGet<any>(url);
}

export async function ingestSeries(series: string[]) {
  // Always fetches ALL available data (no date range)
  const res = await fetch('http://127.0.0.1:8080/v1/macro/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ series })
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json();
}

