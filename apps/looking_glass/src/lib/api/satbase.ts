import { apiGet, apiPost, apiDelete, apiPatch } from './client';

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
 * Get complete data coverage overview (with caching)
 * 
 * By default uses cached data (5 min TTL) for instant responses.
 * Set forceRefresh=true to bypass cache.
 */
export async function getCoverageCached(forceRefresh = false): Promise<CoverageData> {
  const params = new URLSearchParams();
  params.set('cached', forceRefresh ? 'false' : 'true');
  return apiGet<CoverageData>(`/v1/status/coverage?${params.toString()}`);
}

/**
 * Get lightweight topics summary for dashboard/overview
 * 
 * Much faster than getTopicsAll() because:
 * - Only scans last X days (default 30, not 365)
 * - Returns only top N topics (default 10)
 * - Uses optimized Polars aggregation backend
 * 
 * Use this for:
 * - Dashboard KPI cards
 * - Overview page trending topics
 * - Homepage widgets
 */
export async function getTopicsSummary(params?: {
  limit?: number;  // Max topics (1-100, default 10)
  days?: number;   // Look back N days (1-365, default 30)
}): Promise<{
  period: { from: string; to: string; days: number };
  topics: Array<{ name: string; count: number }>;
  total_unique_topics: number;
  total_articles_with_topics: number;
}> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.days) queryParams.set('days', params.days.toString());

  return apiGet(
    `/v1/news/topics/summary${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  );
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
 * Get all configured topics (from watchlist, type='topic')
 */
export async function getConfiguredTopics(): Promise<any> {
  return apiGet(`/v1/news/topics/configured`);
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
  granularity: 'day' | 'month' | 'year' = 'month',
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

/**
 * Get news backend health status
 */
export async function getNewsHealth(): Promise<any> {
  return apiGet(`/v1/news/health`);
}

/**
 * Get comprehensive news metrics and data quality
 */
export async function getNewsMetrics(): Promise<any> {
  return apiGet(`/v1/news/metrics`);
}

/**
 * Get trend analysis (7/30 day trends)
 */
export async function getNewsAnalytics(params?: { days?: number }): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.days) queryParams.set('days', params.days.toString());
  
  return apiGet(`/v1/news/analytics${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
}

/**
 * Get job statistics
 */
export async function getJobStats(): Promise<any> {
  return apiGet(`/v1/admin/jobs/stats`);
}

/**
 * Get list of all jobs with optional filtering
 */
export async function getJobsList(params?: {
  status?: 'queued' | 'running' | 'done' | 'error';
  limit?: number;
  offset?: number;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set('status_filter', params.status);
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  return apiGet(`/v1/ingest/jobs${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
}

/**
 * Get watchlist items with optional filters
 */
export async function getWatchlistItems(params?: {
  type?: 'stock' | 'topic' | 'macro';
  enabled?: boolean;
  active_now?: boolean;
  include_expired?: boolean;
  q?: string;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.set('type', params.type);
  if (params?.enabled !== undefined) queryParams.set('enabled', params.enabled.toString());
  if (params?.active_now) queryParams.set('active_now', 'true');
  if (params?.include_expired) queryParams.set('include_expired', 'true');
  if (params?.q) queryParams.set('q', params.q);

  return apiGet(`/v1/watchlist/items${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
}

/**
 * Get currently active watchlist items (for scheduler)
 */
export async function getActiveWatchlistItems(): Promise<any> {
  return apiGet('/v1/watchlist/active');
}

/**
 * Add one or more watchlist items (stocks, topics, or macro)
 */
export async function addWatchlistItems(payload: {
  items: Array<{
    type: 'stock' | 'topic' | 'macro';
    key: string;
    label?: string;
    enabled?: boolean;
    auto_ingest?: boolean;
    ttl_days?: number;
    active_from?: string;
    active_to?: string;
    metadata?: any;
  }>;
}): Promise<any> {
  return apiPost('/v1/watchlist/items', payload);
}

/**
 * Update a watchlist item (partial update)
 */
export async function updateWatchlistItem(itemId: number, updates: {
  enabled?: boolean;
  auto_ingest?: boolean;
  ttl_days?: number;
  active_from?: string | null;
  active_to?: string | null;
  label?: string;
  metadata?: any;
}): Promise<any> {
  return apiPatch(`/v1/watchlist/items/${itemId}`, updates);
}

/**
 * Delete a watchlist item (soft delete)
 */
export async function deleteWatchlistItem(itemId: number): Promise<any> {
  return apiDelete(`/v1/watchlist/items/${itemId}`);
}

/**
 * Refresh active watchlist items (trigger ingestion jobs)
 */
export async function refreshWatchlist(params?: {
  types?: Array<'stock' | 'topic' | 'macro'>;
  only_active?: boolean;
}): Promise<any> {
  return apiPost('/v1/watchlist/refresh', params || {});
}

// ============================================================================
// Scheduler API
// ============================================================================

export interface SchedulerJob {
  job_id: string;
  name: string;
  enabled: boolean;
  trigger_type: 'cron' | 'interval';
  trigger_config: any;
  job_func: string;
  max_instances: number;
  next_run_time: string | null;
  last_run_time: string | null;
  last_run_status: 'success' | 'error' | 'running' | null;
  last_run_duration_ms: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchedulerExecution {
  id: number;
  job_id: string;
  started_at: string;
  finished_at: string | null;
  status: 'success' | 'error' | 'running' | 'cancelled';
  duration_ms: number | null;
  error_message: string | null;
  result_summary: any;
}

export interface SchedulerGap {
  id: number;
  gap_type: 'news' | 'prices' | 'macro';
  ticker: string | null;
  series_id: string | null;
  from_date: string;
  to_date: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: number;
  detected_at: string;
  filled_at: string | null;
  fill_job_id: number | null;
}

export interface SchedulerStatus {
  status: string;
  stats: {
    total_jobs: number;
    enabled_jobs: number;
    disabled_jobs: number;
    recent_executions: {
      total: number;
      success: number;
      error: number;
      running: number;
    };
    unfilled_gaps: {
      total: number;
      by_type: Record<string, number>;
      by_severity: Record<string, number>;
    };
  };
  timestamp: string;
}

/**
 * Get scheduler status and statistics
 */
export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  return apiGet('/v1/scheduler/status');
}

/**
 * List all scheduler jobs
 */
export async function getSchedulerJobs(enabledOnly?: boolean): Promise<{ count: number; jobs: SchedulerJob[] }> {
  const query = enabledOnly ? '?enabled_only=true' : '';
  return apiGet(`/v1/scheduler/jobs${query}`);
}

/**
 * Get a specific scheduler job
 */
export async function getSchedulerJob(jobId: string): Promise<SchedulerJob> {
  return apiGet(`/v1/scheduler/jobs/${jobId}`);
}

/**
 * Enable a scheduler job
 */
export async function enableSchedulerJob(jobId: string): Promise<any> {
  return apiPost(`/v1/scheduler/jobs/${jobId}/enable`, {});
}

/**
 * Disable a scheduler job
 */
export async function disableSchedulerJob(jobId: string): Promise<any> {
  return apiPost(`/v1/scheduler/jobs/${jobId}/disable`, {});
}

/**
 * Manually trigger a scheduler job
 */
export async function triggerSchedulerJob(jobId: string): Promise<any> {
  return apiPost(`/v1/scheduler/jobs/${jobId}/trigger`, {});
}

/**
 * Update job configuration (trigger_config, enabled, etc.)
 */
export async function updateSchedulerJobConfig(
  jobId: string,
  config: {
    enabled?: boolean;
    trigger_config?: Record<string, any>;
    name?: string;
    trigger_type?: string;
    max_instances?: number;
  }
): Promise<any> {
  return apiPost(`/v1/scheduler/jobs/${jobId}/config`, config);
}

/**
 * Get execution history for a job
 */
export async function getJobExecutions(
  jobId: string,
  params?: { limit?: number; status?: string }
): Promise<{ job_id: string; count: number; executions: SchedulerExecution[] }> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.status) queryParams.set('status_filter', params.status);
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiGet(`/v1/scheduler/jobs/${jobId}/executions${query}`);
}

/**
 * Get all executions across all jobs
 */
export async function getAllExecutions(params?: {
  limit?: number;
  status?: string;
  job_id?: string;
}): Promise<{ count: number; executions: SchedulerExecution[] }> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.status) queryParams.set('status_filter', params.status);
  if (params?.job_id) queryParams.set('job_id', params.job_id);
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiGet(`/v1/scheduler/executions${query}`);
}

/**
 * Get detected gaps
 */
export async function getSchedulerGaps(params?: {
  gap_type?: 'news' | 'prices' | 'macro';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  filled?: boolean;
  limit?: number;
}): Promise<{ count: number; gaps: SchedulerGap[] }> {
  const queryParams = new URLSearchParams();
  if (params?.gap_type) queryParams.set('gap_type', params.gap_type);
  if (params?.severity) queryParams.set('severity', params.severity);
  if (params?.filled !== undefined) queryParams.set('filled', params.filled.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiGet(`/v1/scheduler/gaps${query}`);
}
