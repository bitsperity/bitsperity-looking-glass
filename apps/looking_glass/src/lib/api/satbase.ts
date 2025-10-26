import { apiGet, apiPost, apiDelete } from './client';

// Types
export interface NewsItem {
  id: string;
  source: string;
  title: string;
  text: string;
  url: string;
  published_at: string;
  tickers?: string[];
  regions?: string[];
  themes?: string[];
  content_text?: string;
  content_html?: string;
  fetched_at?: string;
}

export interface CoverageData {
  news: {
    total_articles: number;
    date_range: { from: string | null; to: string | null };
    sources: Record<string, any>;
    tickers_mentioned: number;
    articles_with_bodies: number;
  };
  prices: {
    tickers_available: string[];
    ticker_count: number;
    date_ranges: Record<string, any>;
  };
  macro: {
    fred_series_available: string[];
    series_count: number;
    observations: Record<string, any>;
  };
}

export interface HeatmapResponse {
  from: string;
  to: string;
  granularity: 'year' | 'month';
  data: Array<{
    period: string;
    topic: string;
    count: number;
  }>;
  topics: string[];
  periods: string[];
}

export interface BodyStatsResponse {
  period: { from: string; to: string };
  total_articles: number;
  articles_with_body: number;
  articles_without_body: number;
  success_rate: number;
  coverage_percent: number;
  status: string;
  error_message?: string;
}

export interface GapResponse {
  period: { from: string; to: string };
  coverage: {
    total_days: number;
    covered_days: number;
    gap_days: number;
    coverage_percent: number;
  };
  gaps: Array<{
    date: string;
    article_count: number;
    gap_severity: 'critical' | 'low';
  }>;
  min_articles_threshold: number;
  recommendation: string;
}

export interface ValidationResponse {
  total_checked: number;
  valid_count: number;
  invalid_count: number;
  errors: Array<{
    id: string;
    title: string;
    url: string;
    error: string;
    source: string;
  }>;
  quality_score: number;
}

export interface RecheckResponse {
  success: boolean;
  id: string;
  url?: string;
  has_text?: boolean;
  has_html?: boolean;
  fetched_at?: string;
  content_length?: {
    text: number;
    html: number;
  };
  error?: string;
  retry_at?: string;
}

// API Functions

/**
 * Get complete data coverage overview
 */
export async function getCoverage(): Promise<CoverageData> {
  return apiGet<CoverageData>('/v1/status/coverage');
}

/**
 * Get news with optional body content
 */
export async function listNews(params: {
  from: string;
  to: string;
  q?: string;
  tickers?: string;
  limit?: number;
  offset?: number;
  include_body?: boolean;
  has_body?: boolean;
  content_format?: 'text' | 'html' | 'both';
}): Promise<{
  items: NewsItem[];
  total: number;
  has_more: boolean;
}> {
  const queryParams = new URLSearchParams();
  queryParams.set('from', params.from);
  queryParams.set('to', params.to);
  if (params.q) queryParams.set('q', params.q);
  if (params.tickers) queryParams.set('tickers', params.tickers);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.include_body) queryParams.set('include_body', 'true');
  if (params.has_body) queryParams.set('has_body', 'true');
  if (params.content_format) queryParams.set('content_format', params.content_format);

  return apiGet(`/v1/news?${queryParams.toString()}`);
}

/**
 * Get news coverage heatmap by topic and time period
 */
export async function getHeatmap(params: {
  topics: string;
  from?: string;
  to?: string;
  granularity?: 'year' | 'month';
  format?: 'flat' | 'matrix';
}): Promise<HeatmapResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set('topics', params.topics);
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);
  if (params.granularity) queryParams.set('granularity', params.granularity);
  if (params.format) queryParams.set('format', params.format);

  return apiGet(`/v1/news/heatmap?${queryParams.toString()}`);
}

/**
 * Get news body fetching statistics
 */
export async function getBodyStats(params: {
  from?: string;
  to?: string;
}): Promise<BodyStatsResponse> {
  const queryParams = new URLSearchParams();
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);

  return apiGet(`/v1/news/body-stats?${queryParams.toString()}`);
}

/**
 * Detect date gaps in news coverage
 */
export async function getGaps(params: {
  from?: string;
  to?: string;
  min_articles_per_day?: number;
}): Promise<GapResponse> {
  const queryParams = new URLSearchParams();
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);
  if (params.min_articles_per_day) queryParams.set('min_articles_per_day', params.min_articles_per_day.toString());

  return apiGet(`/v1/news/gaps?${queryParams.toString()}`);
}

/**
 * Batch validate news articles for quality issues
 */
export async function validateNewsBatch(ids: string[]): Promise<ValidationResponse> {
  return apiPost('/v1/news/validate-batch', { ids });
}

/**
 * Re-check and update a specific news article URL
 */
export async function recheckNewsUrl(newsId: string): Promise<RecheckResponse> {
  return apiPost(`/v1/news/recheck-url/${newsId}`, {});
}

/**
 * Delete a news article
 */
export async function deleteNews(newsId: string): Promise<{ success: boolean; id: string }> {
  return apiDelete(`/v1/news/${newsId}`);
}

/**
 * Get trending tickers
 */
export async function getTrendingTickers(params?: {
  hours?: number;
  limit?: number;
  min_mentions?: number;
  only_known_tickers?: boolean;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.hours) queryParams.set('hours', params.hours.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.min_mentions) queryParams.set('min_mentions', params.min_mentions.toString());
  if (params?.only_known_tickers) queryParams.set('only_known_tickers', 'true');

  return apiGet(`/v1/news/trending/tickers?${queryParams.toString()}`);
}

/**
 * Get all topics with global counts
 */
export async function getTopicsAll(from?: string, to?: string): Promise<any> {
  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);

  return apiGet(`/v1/news/topics/all${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
}

/**
 * Get time-series topic statistics
 */
export async function getTopicsStats(
  from?: string,
  to?: string,
  granularity: 'month' | 'year' = 'month'
): Promise<any> {
  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);
  queryParams.set('granularity', granularity);

  return apiGet(`/v1/news/topics/stats${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
}

/**
 * Get topic coverage data for heatmap
 */
export async function getTopicsCoverage(
  topics: string,
  from?: string,
  to?: string,
  granularity: 'month' | 'year' = 'month',
  format: 'flat' | 'matrix' = 'flat'
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.set('topics', topics);
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);
  queryParams.set('granularity', granularity);
  queryParams.set('format', format);

  return apiGet(`/v1/news/topics/coverage?${queryParams.toString()}`);
}

/**
 * Add a new topic
 */
export async function addTopic(symbol: string, expiresAt?: string): Promise<any> {
  return apiPost('/v1/news/topics/add', {
    symbol,
    expires_at: expiresAt
  });
}

/**
 * Delete a topic
 */
export async function deleteTopic(topicName: string): Promise<any> {
  return apiDelete(`/v1/news/topics/${topicName}`);
}
