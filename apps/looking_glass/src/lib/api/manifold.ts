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
// Relations extras
export const relatedFacets = (id: string) => http<{ status: string; facets: Record<string, { value: string; count: number }[]> }>(`/v1/memory/thought/${id}/related/facets`);
export const relatedGraph = (id: string, depth = 1) => http<{ status: string; nodes: any[]; edges: any[] }>(`/v1/memory/thought/${id}/related/graph?depth=${depth}`);
export const globalGraph = (params: { limit?: number; type?: string; status?: string; tickers?: string; session_id?: string; workspace_id?: string } = {}) => {
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.type) q.set('type', params.type);
  if (params.status) q.set('status', params.status);
  if (params.tickers) q.set('tickers', params.tickers);
  if (params.session_id) q.set('session_id', params.session_id);
  if (params.workspace_id) q.set('workspace_id', params.workspace_id);
  return http<{ status: string; nodes: any[]; edges: any[] }>(`/v1/memory/graph?${q.toString()}`);
};

// Bulk
export const bulkQuarantine = (ids: string[], reason?: string) => http<{ status: string; updated: number }>(`/v1/memory/bulk/quarantine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, reason }) });
export const bulkUnquarantine = (ids: string[]) => http<{ status: string; updated: number }>(`/v1/memory/bulk/unquarantine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
export const bulkReembed = (ids: string[], vectors: ('text'|'title')[] = ['text','title']) => http<{ status: string; updated: number }>(`/v1/memory/bulk/reembed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, vectors }) });
export const bulkPromote = (ids: string[]) => http<{ status: string; marked: number }>(`/v1/memory/bulk/promote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });

// Sessions (NEW)
export const getSessions = (limit = 100) => 
  http<any>(`/v1/memory/sessions?limit=${limit}`);

export const getSessionThoughts = (sid: string, include_content = true) => 
  http<any>(`/v1/memory/session/${sid}/thoughts?include_content=${include_content}`);

export const getSessionGraph = (sid: string) => 
  http<any>(`/v1/memory/session/${sid}/graph`);

export const getSessionSummary = (sid: string) => 
  http<any>(`/v1/memory/session/${sid}/summary`);

export const upsertSessionSummary = (sid: string, body: any) => 
  http<any>(`/v1/memory/session/${sid}/summary`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });

// Children & Tree (NEW)
export const getChildren = (id: string) => 
  http<any>(`/v1/memory/thought/${id}/children`);

export const getTree = (id: string, depth = 3) => 
  http<any>(`/v1/memory/thought/${id}/tree?depth=${depth}`);

// Duplicate Warnings (NEW)
export const checkDuplicate = (body: any) => 
  http<any>(`/v1/memory/check-duplicate`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });

export const getDuplicateWarnings = (threshold = 0.92, limit = 50, session_id?: string) => {
  const q = new URLSearchParams({ threshold: String(threshold), limit: String(limit) });
  if (session_id) q.set('session_id', session_id);
  return http<any>(`/v1/memory/warnings/duplicates?${q.toString()}`);
};

// Enhanced Search V2 (NEW)
export const searchV2 = (body: {
  query?: string;
  vector_type?: 'summary' | 'text' | 'title';
  include_content?: boolean;
  filters?: any;
  limit?: number;
}) => http<any>(`/v1/memory/search`, { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' }, 
  body: JSON.stringify(body) 
});


