const TESSERACT_BASE = import.meta.env.VITE_TESSERACT_BASE || 'http://127.0.0.1:8081';

export type SearchFilters = {
  tickers?: string[];
  from?: string;
  to?: string;
};

export type SearchResult = {
  id: string;
  score: number;
  title: string;
  text: string;
  source: string;
  url: string;
  published_at: string;
  tickers: string[];
};

export async function semanticSearch(query: string, filters?: SearchFilters, limit: number = 20) {
  const response = await fetch(`${TESSERACT_BASE}/v1/tesseract/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters, limit })
  });
  if (!response.ok) throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  return await response.json();
}

export async function findSimilar(newsId: string, limit: number = 10) {
  const resp = await fetch(`${TESSERACT_BASE}/v1/tesseract/similar/${newsId}?limit=${limit}`);
  if (!resp.ok) throw new Error(`Similar failed: ${resp.status} ${resp.statusText}`);
  return await resp.json();
}

// Admin / Collection management
export type EmbedStatus = {
  collection_exists: boolean;
  vector_count?: number;
  vector_size?: number;
  status: 'idle' | 'running' | 'done' | 'error' | 'not_initialized';
  processed?: number;
  total?: number;
  percent?: number;
  device?: string;
  started_at?: number;
  updated_at?: number;
  error?: string | null;
};

export async function adminInitCollection(): Promise<{ status: string; collection?: string; alias?: string; message?: string }> {
  const resp = await fetch(`${TESSERACT_BASE}/v1/admin/init-collection`, { method: 'POST' });
  if (!resp.ok) throw new Error(`init-collection failed: ${resp.status}`);
  return await resp.json();
}

export async function adminEmbedBatch(from_date: string, to_date: string): Promise<{ status: string; message: string; check_progress: string }> {
  const resp = await fetch(`${TESSERACT_BASE}/v1/admin/embed-batch?from_date=${encodeURIComponent(from_date)}&to_date=${encodeURIComponent(to_date)}`, { method: 'POST' });
  if (!resp.ok) throw new Error(`embed-batch failed: ${resp.status}`);
  return await resp.json();
}

export async function adminEmbedStatus(): Promise<EmbedStatus> {
  const resp = await fetch(`${TESSERACT_BASE}/v1/admin/embed-status`);
  if (!resp.ok) throw new Error(`embed-status failed: ${resp.status}`);
  return await resp.json();
}

export type CollectionsResponse = { collections: { name: string; vectors_count?: number }[] } | any;

export async function adminListCollections(): Promise<CollectionsResponse> {
  const resp = await fetch(`${TESSERACT_BASE}/v1/admin/collections`);
  if (!resp.ok) throw new Error(`collections failed: ${resp.status}`);
  return await resp.json();
}

export async function adminSwitchCollection(name: string): Promise<{ status: string; alias?: string; target?: string; message?: string }> {
  const resp = await fetch(`${TESSERACT_BASE}/v1/admin/collections/switch?name=${encodeURIComponent(name)}`, { method: 'POST' });
  if (!resp.ok) throw new Error(`switch failed: ${resp.status}`);
  return await resp.json();
}

export async function adminDeleteCollection(name: string): Promise<{ status: string; collection?: string; message?: string }> {
  const resp = await fetch(`${TESSERACT_BASE}/v1/admin/collections/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(`delete failed: ${resp.status}`);
  return await resp.json();
}

