import { apiGet, ApiError, apiPost, apiPollJob } from './client';

export type DailyBar = { date: string; ticker: string; open: number; high: number; low: number; close: number; volume?: number | null };

export type TickerSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector: string;
};

export type TickerInfo = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  country: string;
  currency: string;
  exchange: string;
  market_cap: number;
  enterprise_value: number;
  employees: number;
};

export type TickerFundamentals = {
  symbol: string;
  current_price: number;
  previous_close: number;
  day_high: number;
  day_low: number;
  volume: number;
  avg_volume: number;
  market_cap: number;
  pe_ratio: number;
  forward_pe: number;
  peg_ratio: number;
  price_to_book: number;
  eps: number;
  dividend_yield: number;
  beta: number;
  '52_week_high': number;
  '52_week_low': number;
  revenue: number;
  revenue_per_share: number;
  profit_margin: number;
  operating_margin: number;
  return_on_equity: number;
  return_on_assets: number;
  debt_to_equity: number;
  recommendation: string;
  target_price: number;
};

export async function getPricesSingle(ticker: string, from: string, to: string, btc_view = false) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (btc_view) qs.set('btc_view', 'true');
  qs.set('sync_timeout_s', '3');
  
  try {
    return await apiGet<{ bars: DailyBar[]; ticker: string; last_date: string; source: string }>(`/v1/prices/${ticker}?${qs.toString()}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 202) {
      // Retry after sync_timeout_s
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await apiGet<{ bars: DailyBar[]; ticker: string; last_date: string; source: string }>(`/v1/prices/${ticker}?${qs.toString()}`);
    }
    throw e;
  }
}

export async function getPricesMulti(tickers: string[], from: string, to: string, btc_view = false) {
  const results: Record<string, DailyBar[]> = {};
  for (const ticker of tickers) {
    try {
      const res = await getPricesSingle(ticker, from, to, btc_view);
      results[ticker] = res.bars || [];
    } catch (e) {
      results[ticker] = [];
    }
  }
  return { series: results };
}

export async function searchTickers(query: string, limit: number = 10) {
  return await apiGet<{ query: string; count: number; results: TickerSearchResult[]; error?: string }>(`/v1/prices/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function getTickerInfo(ticker: string) {
  return await apiGet<TickerInfo | { error: string }>(`/v1/prices/info/${ticker}`);
}

export async function getTickerFundamentals(ticker: string) {
  return await apiGet<TickerFundamentals | { error: string }>(`/v1/prices/fundamentals/${ticker}`);
}

