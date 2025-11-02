import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import logger from '../../logger.js';

export const newsGapsTool = {
  name: 'news-gaps',
  config: {
    title: 'Detect News Coverage Gaps',
    description: 'Detect date gaps in news coverage by identifying days with insufficient articles (below threshold). Returns list of gap dates, gap severity (critical/low), and statistics. Useful for planning backfill operations, identifying missing coverage periods, or validating data completeness. Filter by date range and set minimum articles threshold (default 10 articles per day). Returns gap dates sorted chronologically.',
    inputSchema: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date in YYYY-MM-DD format. Defaults to 365 days ago if omitted.'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date in YYYY-MM-DD format. Defaults to today if omitted.'),
      min_articles_per_day: z.number().int().min(1).default(10).describe('Minimum articles threshold per day. Days with fewer articles are considered gaps. Default 10, adjust based on expected coverage.')
    }).shape
  },
  handler: async (input: { from?: string; to?: string; min_articles_per_day?: number }) => {
    logger.info({ tool: 'news-gaps', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.from) params.append('from', input.from);
      if (input.to) params.append('to', input.to);
      if (input.min_articles_per_day) params.append('min_articles_per_day', input.min_articles_per_day.toString());

      const result = await callSatbase<any>(
        `/v1/news/gaps?${params.toString()}`,
        {},
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-gaps', duration, gaps: result.gaps?.length || 0 }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-gaps', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const cleanupJunkBodiesTool = {
  name: 'cleanup-junk-bodies',
  config: {
    title: 'Cleanup Junk News Bodies',
    description: 'Scan and remove low-quality news article bodies that contain junk content (access denied messages, paywalls, cookie consent notices, etc.). Uses semantic similarity checks to identify junk patterns. Improves data quality by removing unusable content. Use dry_run=true to preview affected articles. tag_only=true marks articles but doesn\'t delete from Tesseract vectors. Returns count of affected articles.',
    inputSchema: z.object({
      dry_run: z.boolean().default(true).describe('If true (default): preview affected articles without making changes. If false: actually remove junk bodies.'),
      max_items: z.number().int().min(1).max(10000).default(1000).describe('Maximum articles to scan. Default 1000, max 10000. Processes articles until limit reached or all scanned.'),
      tag_only: z.boolean().default(false).describe('If true: only tag articles as no_body_crawl but don\'t delete from Tesseract vectors. If false: full cleanup including vector deletion.')
    }).shape
  },
  handler: async (input: { dry_run?: boolean; max_items?: number; tag_only?: boolean }) => {
    logger.info({ tool: 'cleanup-junk-bodies', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        dry_run: (input.dry_run ?? true).toString(),
        max_items: (input.max_items || 1000).toString(),
        tag_only: (input.tag_only || false).toString()
      });

      const result = await callSatbase<any>(
        `/v1/admin/news/cleanup-junk?${params.toString()}`,
        { method: 'POST' },
        120000 // 2 minutes timeout
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'cleanup-junk-bodies', duration, affected: result.affected }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'cleanup-junk-bodies', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const cleanupQualityBodiesTool = {
  name: 'cleanup-quality-bodies',
  config: {
    title: 'Cleanup Low-Quality Bodies',
    description: 'Scan news article bodies using scientific quality metrics (link density, text density, stopword ratio, content length, etc.) and remove bodies below quality threshold. Quality score ranges 0.0-1.0 (higher = better). Removes articles with excessive ads, navigation elements, or minimal actual content. Use dry_run=true to preview. Returns count of removed articles and quality distribution. Default threshold 0.35 balances quality vs coverage.',
    inputSchema: z.object({
      dry_run: z.boolean().default(true).describe('If true (default): preview affected articles without making changes. If false: actually remove low-quality bodies.'),
      max_items: z.number().int().min(1).max(10000).default(1000).describe('Maximum articles to scan. Default 1000, max 10000.'),
      quality_threshold: z.number().min(0).max(1).default(0.35).describe('Quality score threshold (0.0-1.0). Bodies below this score are removed. Default 0.35, adjust based on quality requirements (higher = stricter).')
    }).shape
  },
  handler: async (input: { dry_run?: boolean; max_items?: number; quality_threshold?: number }) => {
    logger.info({ tool: 'cleanup-quality-bodies', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        dry_run: (input.dry_run ?? true).toString(),
        max_items: (input.max_items || 1000).toString(),
        quality_threshold: (input.quality_threshold || 0.35).toString()
      });

      const result = await callSatbase<any>(
        `/v1/admin/news/cleanup-quality?${params.toString()}`,
        { method: 'POST' },
        120000 // 2 minutes timeout
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'cleanup-quality-bodies', duration, affected: result.affected }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'cleanup-quality-bodies', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const newsSchemaInfoTool = {
  name: 'news-schema-info',
  config: {
    title: 'Get News Schema Info',
    description: 'Get current news_articles database table schema, column definitions, indexes, constraints, and metadata for debugging. Useful for understanding data structure, verifying migrations, or troubleshooting database issues. Returns schema details including column types, nullable status, defaults, and index information.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'news-schema-info' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/admin/news/schema',
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-schema-info', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-schema-info', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getAuditLogTool = {
  name: 'get-audit-log',
  config: {
    title: 'Get Audit Trail',
    description: 'Get audit log of all data operations on news articles. Tracks actions like ingested (new article added), deleted (article removed), tagged_topic (topic assigned), body_fetched (body content retrieved), and more. Useful for debugging, compliance, understanding data changes, or tracing article lifecycle. Filter by article_id, action type, or time period (days). Returns chronological list of audit entries with timestamps, user/system, and details.',
    inputSchema: z.object({
      article_id: z.string().optional().describe('Filter by specific article ID to see all operations on that article.'),
      action: z.string().optional().describe('Filter by action type: "ingested", "deleted", "tagged_topic", "body_fetched", etc.'),
      days: z.number().int().min(1).max(365).optional().describe('Time period in days to look back. Defaults to all available if omitted.'),
      limit: z.number().int().min(1).max(10000).default(1000).describe('Maximum audit entries to return. Default 1000, max 10000.')
    }).shape
  },
  handler: async (input: { article_id?: string; action?: string; days?: number; limit?: number }) => {
    logger.info({ tool: 'get-audit-log', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.article_id) params.append('article_id', input.article_id);
      if (input.action) params.append('action', input.action);
      if (input.days) params.append('days', input.days.toString());
      if (input.limit) params.append('limit', input.limit.toString());

      const result = await callSatbase<any>(
        `/v1/admin/audit?${params.toString()}`,
        {},
        20000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-audit-log', duration, entries: result.total }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'get-audit-log', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getDuplicateArticlesTool = {
  name: 'get-duplicate-articles',
  config: {
    title: 'Find Duplicate Articles',
    description: 'Find potential duplicate articles by detecting articles with the same URL. Duplicates can occur when the same article is fetched multiple times (different queries, re-ingestion, etc.). Returns groups of duplicate articles with their IDs and metadata. Useful for data quality maintenance, storage optimization, or identifying ingestion issues. Review duplicates before deleting to ensure they are truly redundant.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'get-duplicate-articles' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/admin/articles/duplicates',
        {},
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-duplicate-articles', duration, duplicates: result.total_duplicates }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'get-duplicate-articles', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const newsMetricsTool = {
  name: 'news-metrics',
  config: {
    title: 'Get News Metrics',
    description: 'Get comprehensive data quality and coverage metrics for news articles. Returns total article count, body coverage percentage (articles with full body content), date range coverage, source distribution, topic coverage, quality scores, and other statistical indicators. Essential for understanding data health, identifying quality issues, or generating dashboard reports. Use this to assess overall news data quality.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'news-metrics' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/news/metrics',
        {},
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-metrics', duration, total_articles: result.total_articles }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-metrics', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const auditStatsTool = {
  name: 'audit-stats',
  config: {
    title: 'Get Audit Statistics',
    description: 'Get aggregated audit statistics showing action counts by type over a time period. Returns counts for each action type (ingested, deleted, tagged_topic, body_fetched, etc.) with percentages and trends. Useful for understanding data operation patterns, identifying most frequent actions, or generating admin reports. Filter by days to focus on recent activity or historical trends.',
    inputSchema: z.object({
      days: z.number().int().min(1).max(365).default(30).describe('Time period in days to analyze. Default 30 days, max 365. Statistics are aggregated over this period.')
    }).shape
  },
  handler: async (input: { days?: number }) => {
    logger.info({ tool: 'audit-stats', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        days: (input.days || 30).toString()
      });

      const result = await callSatbase<any>(
        `/v1/admin/audit/stats?${params.toString()}`,
        {},
        20000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'audit-stats', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'audit-stats', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const refetchBodiesTool = {
  name: 'refetch-bodies',
  config: {
    title: 'Refetch Missing Bodies',
    description: 'Re-fetch article body content for articles that currently have no body AND are not tagged as no_body_crawl (indicating they should be fetchable). Skips articles tagged as no_body_crawl since those are known to be unfetchable (paywalls, access denied, etc.). Use dry_run=true to preview how many articles would be affected. Returns count of articles processed and success rate.',
    inputSchema: z.object({
      max_items: z.number().int().min(1).max(1000).default(100).describe('Maximum articles to process. Default 100, max 1000. Processes articles missing bodies (excluding no_body_crawl) until limit reached.'),
      dry_run: z.boolean().default(false).describe('If true: preview affected articles without actually fetching. If false (default): actually fetch and update article bodies.')
    }).shape
  },
  handler: async (input: { max_items?: number; dry_run?: boolean }) => {
    logger.info({ tool: 'refetch-bodies', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        max_items: (input.max_items || 100).toString(),
        dry_run: (input.dry_run || false).toString()
      });

      const result = await callSatbase<any>(
        `/v1/admin/news/refetch-bodies?${params.toString()}`,
        { method: 'POST' },
        120000 // 2 minutes
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'refetch-bodies', duration, success: result.success }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'refetch-bodies', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const listAdaptersTool = {
  name: 'list-adapters',
  config: {
    title: 'List Data Adapters',
    description: 'List all available data adapters in Satbase. Adapters are connectors to external data sources (Mediastack for news, Alpaca for prices, FRED for macro data, etc.). Returns adapter names, categories, capabilities, configuration options, and status. Optionally filter by category (news/prices/macro). Useful for understanding available data sources, checking adapter health, or configuring ingestion.',
    inputSchema: z.object({
      category: z.string().optional().describe('Optional filter by adapter category: "news" (Mediastack), "prices" (Alpaca), "macro" (FRED), etc.')
    }).shape
  },
  handler: async (input: { category?: string }) => {
    logger.info({ tool: 'list-adapters', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.category) params.append('category', input.category);

      const queryString = params.toString();
      const url = queryString ? `/v1/ingest/adapters?${queryString}` : '/v1/ingest/adapters';

      const result = await callSatbase<any>(
        url,
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'list-adapters', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'list-adapters', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const backfillMonitorTool = {
  name: 'backfill-monitor',
  config: {
    title: 'Monitor Backfill Job',
    description: 'Get live progress of a news backfill job. Returns real-time status including current date being processed, articles fetched so far, total days remaining, estimated completion time, and any errors encountered. More detailed than get-job for backfill operations. Use this to track long-running backfill jobs and understand progress through the date range.',
    inputSchema: z.object({
      job_id: z.string().describe('Backfill job ID to monitor. Get from news-backfill response.')
    }).shape
  },
  handler: async (input: { job_id: string }) => {
    logger.info({ tool: 'backfill-monitor', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/ingest/backfill-monitor/${input.job_id}`,
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'backfill-monitor', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'backfill-monitor', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

