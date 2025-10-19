import { apiGet, apiPost, ApiError, apiPollJob } from './client';

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

export async function listNews(params: { from: string; to: string; q?: string; tickers?: string; limit?: number; include_body?: boolean }) {
  const qs = new URLSearchParams();
  qs.set('from', params.from);
  qs.set('to', params.to);
  if (params.q) qs.set('q', params.q);
  if (params.tickers) qs.set('tickers', params.tickers);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.include_body) qs.set('include_body', 'true');
  return await apiGet<{ items: NewsItem[] }>(`/v1/news?${qs.toString()}`);
}

export async function backfillBodies(from: string, to: string) {
  const res = await apiPost<{ job_id: string }>(`/v1/ingest/news/bodies`, { from, to });
  return res.job_id;
}

