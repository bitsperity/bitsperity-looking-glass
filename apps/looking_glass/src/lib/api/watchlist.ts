import { apiGet, apiPost, apiPollJob } from './client';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8080';

export type WatchlistItem = { symbol: string; added_at: string; expires_at?: string | null };
export type NewsTopic = { query: string; added_at: string; expires_at?: string | null };

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const res = await apiGet<{ count: number; items: WatchlistItem[] }>(`/v1/watchlist`);
  return res.items || [];
}

export async function postWatchlist(payload: { symbols: string[]; ttl_days?: number; ingest?: boolean }) {
  const res = await apiPost<{ added: WatchlistItem[]; job_id?: string; status?: string }>(`/v1/watchlist`, payload);
  // If ingest was triggered, wait for job to complete
  if (res.job_id && payload.ingest) {
    await apiPollJob(res.job_id);
  }
  return res;
}

export async function deleteWatchlist(symbol: string) {
  return await fetch(`${API_BASE}/v1/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
}

export async function getTopics(): Promise<NewsTopic[]> {
  const res = await apiGet<{ count: number; items: NewsTopic[] }>(`/v1/news/topics`);
  return res.items || [];
}

export async function postTopics(payload: { queries: string[]; ttl_days?: number; ingest?: boolean; hours?: number }) {
  return await apiPost(`/v1/news/topics`, payload);
}

export async function deleteTopic(query: string) {
  return await fetch(`${API_BASE}/v1/news/topics/${encodeURIComponent(query)}`, { method: 'DELETE' });
}

