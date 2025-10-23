const MANIFOLD_BASE = import.meta.env.VITE_MANIFOLD_BASE || 'http://127.0.0.1:8083';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${MANIFOLD_BASE}${path}`, init);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
  }
  return (await resp.json()) as T;
}

// Health
export const getHealth = () => http<{ status: string; qdrant_connected: boolean; collection_name: string; embedding_model: string }>(`/v1/memory/health`);
export const getConfig = () => http<{ status: string; collection_name: string; vector_dim: number; embedding_provider: string }>(`/v1/memory/config`);
export const getDevice = () => http<any>(`/v1/memory/device`);

// Thoughts CRUD
export type ThoughtEnvelope = any; // Spiegel vom Backend; verfeinern in lib/types/manifold.ts
export const createThought = (body: ThoughtEnvelope) => http<{ status: string; thought_id: string }>(`/v1/memory/thought`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const getThought = (id: string) => http<ThoughtEnvelope>(`/v1/memory/thought/${id}`);
export const patchThought = (id: string, patch: Record<string, any>) => http<{ status: string }>(`/v1/memory/thought/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
export const deleteThought = (id: string, soft = true) => http<{ status: string }>(`/v1/memory/thought/${id}?soft=${soft}`, { method: 'DELETE' });

// Search & Analytics
export const search = (body: any) => http<any>(`/v1/memory/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const timeline = (params: { from_dt?: string; to_dt?: string; type?: string; tickers?: string }) => {
  const q = new URLSearchParams();
  if (params.from_dt) q.set('from_dt', params.from_dt);
  if (params.to_dt) q.set('to_dt', params.to_dt);
  if (params.type) q.set('type', params.type);
  if (params.tickers) q.set('tickers', params.tickers);
  return http<any>(`/v1/memory/timeline?${q.toString()}`);
};
export const stats = (params: { tickers?: string; timeframe?: string }) => {
  const q = new URLSearchParams();
  if (params.tickers) q.set('tickers', params.tickers);
  if (params.timeframe) q.set('timeframe', params.timeframe);
  return http<any>(`/v1/memory/stats?${q.toString()}`);
};

// Relations
export const getRelated = (id: string) => http<any>(`/v1/memory/thought/${id}/related`);
export const linkRelated = (id: string, related_id: string) => http<{ status: string }>(`/v1/memory/thought/${id}/related`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ related_id }) });
export const unlinkRelated = (id: string, related_id: string) => http<{ status: string }>(`/v1/memory/thought/${id}/related/${related_id}`, { method: 'DELETE' });

// Promote & Sync
export const promote = (id: string, body: { auto_mark?: boolean }) => http<{ status: string; kg_payload: any }>(`/v1/memory/thought/${id}/promote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
export const syncAriadne = (body: { thought_id: string; status?: 'validated' | 'invalidated'; ariadne_fact_id?: string; ariadne_entity_ids?: string[] }) => http<{ status: string; thought_id: string }>(`/v1/memory/sync/ariadne`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Admin & Advanced
export const reembedThought = (id: string, vectors: ('text' | 'title')[] = ['text', 'title']) => http<{ status: string }>(`/v1/memory/thought/${id}/reembed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vectors }) });
export const reindex = (dry_run = true, filters?: any) => http<{ status: string; would_reindex?: number; reindexed?: number }>(`/v1/memory/reindex`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dry_run, filters }) });
export const dedupe = (filters?: any, threshold = 0.95) => http<{ status: string; scanned: number; duplicates: any[] }>(`/v1/memory/dedupe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters, threshold }) });
export const getTrash = () => http<{ status: string; thoughts: any[] }>(`/v1/memory/trash`);
export const restoreTrash = (id: string) => http<{ status: string }>(`/v1/memory/trash/${id}/restore`, { method: 'POST' });
export const quarantine = (id: string, reason?: string) => http<{ status: string }>(`/v1/memory/thought/${id}/quarantine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
export const unquarantine = (id: string) => http<{ status: string }>(`/v1/memory/thought/${id}/unquarantine`, { method: 'POST' });
export const getHistory = (id: string) => http<{ status: string; versions: any[] }>(`/v1/memory/thought/${id}/history`);
export const similar = (id: string, k = 10) => http<{ status: string; similar: any[] }>(`/v1/memory/similar/${id}?k=${k}`);


