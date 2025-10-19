import { apiGet, ApiError, apiPost, apiPollJob } from './client';

export type DailyBar = { date: string; ticker: string; open: number; high: number; low: number; close: number; volume?: number | null };

export async function getPricesSingle(ticker: string, from: string, to: string, btc_view = false) {
  try {
    return await apiGet<{ bars: DailyBar[] }>(`/v1/prices/daily/${ticker}?from=${from}&to=${to}&btc_view=${btc_view ? 'true' : 'false'}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 202 && e.body?.job_id) {
      await apiPollJob(e.body.job_id);
      return await apiGet<{ bars: DailyBar[] }>(`/v1/prices/daily/${ticker}?from=${from}&to=${to}&btc_view=${btc_view ? 'true' : 'false'}`);
    }
    throw e;
  }
}

export async function getPricesMulti(tickers: string[], from: string, to: string, btc_view = false) {
  const qs = new URLSearchParams();
  qs.set('tickers', tickers.join(','));
  qs.set('from', from);
  qs.set('to', to);
  if (btc_view) qs.set('btc_view', 'true');
  try {
    return await apiGet<{ series: Record<string, DailyBar[]> }>(`/v1/prices/daily?${qs.toString()}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 202 && e.body?.job_id) {
      await apiPollJob(e.body.job_id);
      return await apiGet<{ series: Record<string, DailyBar[]> }>(`/v1/prices/daily?${qs.toString()}`);
    }
    throw e;
  }
}

