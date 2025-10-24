import { config } from '../config.js';
import { logger } from '../logger.js';

export async function callManifold<T = any>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${config.MANIFOLD_API_URL}${path}`;
  const opts: RequestInit = {
    method: init?.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: init?.body,
    signal: controller.signal
  };
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data as T;
  } catch (e: any) {
    logger.error({ url, error: e?.message }, 'callManifold failed');
    throw e;
  } finally {
    clearTimeout(id);
  }
}


