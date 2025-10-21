import { apiGet, apiPost, apiDelete, ApiError, apiPollJob } from './client';

export type NewsItem = {
  id: string;
  source: string;
  title: string;
  text: string;
  url: string;
  published_at: string;
  tickers?: string[];
  content_text?: string | null;
  content_html?: string | null;
};

export type NewsAdapter = {
  name: string;
  category: string;
  supports_historical: boolean;
  description: string;
};

export async function listNews(params: { from: string; to: string; q?: string; tickers?: string; limit?: number; offset?: number; include_body?: boolean }) {
  const qs = new URLSearchParams();
  qs.set('from', params.from);
  qs.set('to', params.to);
  if (params.q) qs.set('q', params.q);
  if (params.tickers) qs.set('tickers', params.tickers);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  if (params.include_body) qs.set('include_body', 'true');
  return await apiGet<{ items: NewsItem[]; total: number; offset: number; limit: number; has_more: boolean }>(`/v1/news?${qs.toString()}`);
}

export async function deleteNews(id: string) {
  return await apiDelete<{ success: boolean; message: string }>(`/v1/news/${id}`);
}

export async function backfillBodies(from: string, to: string) {
  const res = await apiPost<{ job_id: string }>(`/v1/ingest/news/bodies`, { from, to });
  return res.job_id;
}

export async function backfillHistorical(query: string, from: string, to: string) {
  const res = await apiPost<{ job_id: string; adapters: string[]; message: string }>(`/v1/ingest/news/backfill`, { query, from, to });
  return res;
}

export async function listAdapters(category?: string) {
  const qs = category ? `?category=${category}` : '';
  return await apiGet<{ count: number; adapters: NewsAdapter[] }>(`/v1/ingest/adapters${qs}`);
}

