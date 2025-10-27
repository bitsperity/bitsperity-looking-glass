const TESSERACT_BASE = import.meta.env.VITE_TESSERACT_BASE || 'http://127.0.0.1:8081';

// Core Types
export type SearchFilters = {
  topics?: string[];
  tickers?: string[];
  language?: string;
  body_available?: boolean;
};

export type SearchResult = {
  id: string;
  score: number;
  title: string;
  text: string;
  source?: string;
  source_name?: string;
  url: string;
  published_at: string;
  topics?: string[];
  tickers?: string[];
  language?: string;
  body_available?: boolean;
};

export type SearchResponse = {
  query: string;
  count: number;
  results: SearchResult[];
};

export type SimilarResponse = {
  source_article: SearchResult;
  similar_articles: SearchResult[];
};

export type EmbedJobRequest = {
  from_date: string;
  to_date: string;
  topics?: string | null;
  tickers?: string | null;
  language?: string | null;
  body_only?: boolean;
  incremental?: boolean;
};

export type EmbedJobResponse = {
  status: string;
  job_id: string;
  message: string;
  check_progress: string;
};

export type JobStatus = {
  job_id?: string;
  status: 'created' | 'running' | 'done' | 'error';
  processed: number;
  total: number;
  percent: number;
  started_at?: number;
  completed_at?: number;
  error?: string | null;
  params?: Record<string, unknown>;
};

export type OverallStatus = {
  collection_name: string;
  total_vectors: number;
  vector_size: number;
  total_embedded_articles: number;
  recent_jobs: JobStatus[];
};

export type Collection = {
  name: string;
  points_count: number;
  vector_size: number;
  distance: string;
};

export type CollectionsResponse = {
  collections: Collection[];
  active_alias: string;
  active_target: string;
};

// Search API with debounce support
const searchAbortController = new AbortController();

export async function search(
  query: string,
  filters?: SearchFilters,
  limit: number = 20
): Promise<SearchResponse> {
  searchAbortController.abort();
  const controller = new AbortController();
  Object.assign(searchAbortController, controller);

  const response = await fetch(`${TESSERACT_BASE}/v1/tesseract/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters, limit }),
    signal: controller.signal
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export async function findSimilar(
  newsId: string,
  limit: number = 10
): Promise<SimilarResponse> {
  const response = await fetch(
    `${TESSERACT_BASE}/v1/tesseract/similar/${encodeURIComponent(newsId)}?limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Similar failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

// Admin: Embedding Jobs
export async function embedBatch(
  request: EmbedJobRequest
): Promise<EmbedJobResponse> {
  const response = await fetch(`${TESSERACT_BASE}/v1/admin/embed-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Embed batch failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export async function getEmbedStatus(
  jobId?: string
): Promise<JobStatus | OverallStatus> {
  const url = jobId
    ? `${TESSERACT_BASE}/v1/admin/embed-status?job_id=${encodeURIComponent(jobId)}`
    : `${TESSERACT_BASE}/v1/admin/embed-status`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Embed status failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

// Admin: Collections
export async function initCollection(): Promise<{ status: string; collection: string }> {
  const response = await fetch(`${TESSERACT_BASE}/v1/admin/init-collection`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Init collection failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export async function listCollections(): Promise<CollectionsResponse> {
  const response = await fetch(`${TESSERACT_BASE}/v1/admin/collections`);

  if (!response.ok) {
    throw new Error(`List collections failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export async function switchCollection(
  name: string
): Promise<{ status: string; alias: string; target: string }> {
  const response = await fetch(`${TESSERACT_BASE}/v1/admin/collections/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    throw new Error(`Switch collection failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export async function health(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${TESSERACT_BASE}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

