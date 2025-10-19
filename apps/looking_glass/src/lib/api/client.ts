const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8080';

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`);
  if (resp.status === 202) {
    // fetch-on-miss: caller should handle via apiPollJob
    const body = await resp.json().catch(() => ({}));
    throw new ApiError(202, body);
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new ApiError(resp.status, body);
  }
  return (await resp.json()) as T;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok && resp.status !== 202) {
    const txt = await resp.text();
    throw new ApiError(resp.status, txt);
  }
  return (await resp.json()) as T;
}

export async function apiPollJob(jobId: string, maxTries = 30, intervalMs = 1000): Promise<any> {
  for (let i = 0; i < maxTries; i++) {
    const resp = await fetch(`${API_BASE}/v1/ingest/jobs/${jobId}`);
    const body = await resp.json().catch(() => ({}));
    if (body.status === 'done') return body;
    if (body.status === 'error') throw new ApiError(500, body);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Job polling timeout');
}

