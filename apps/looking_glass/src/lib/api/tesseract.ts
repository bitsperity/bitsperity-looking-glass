import { apiGet } from './client';

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
  const TESSERACT_BASE = import.meta.env.VITE_TESSERACT_BASE || 'http://127.0.0.1:8081';
  
  const response = await fetch(`${TESSERACT_BASE}/v1/tesseract/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters, limit })
  });
  
  if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
  return await response.json();
}

export async function findSimilar(newsId: string, limit: number = 10) {
  const TESSERACT_BASE = import.meta.env.VITE_TESSERACT_BASE || 'http://127.0.0.1:8081';
  return await apiGet(`${TESSERACT_BASE}/v1/tesseract/similar/${newsId}?limit=${limit}`);
}

