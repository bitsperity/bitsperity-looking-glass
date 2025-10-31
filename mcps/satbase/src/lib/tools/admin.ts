import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import logger from '../../logger.js';

export const newsGapsTool = {
  name: 'news-gaps',
  config: {
    title: 'Detect News Coverage Gaps',
    description: 'Detect date gaps in news coverage (days with insufficient articles). Useful for planning backfill operations.',
    inputSchema: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date (YYYY-MM-DD, defaults to 365 days ago)'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date (YYYY-MM-DD, defaults to today)'),
      min_articles_per_day: z.number().int().min(1).default(10).describe('Minimum articles threshold')
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
    description: 'Scan and remove low-quality news bodies (access denied, paywalls, etc). Uses semantic similarity checks.',
    inputSchema: z.object({
      dry_run: z.boolean().default(true).describe('Preview without making changes'),
      max_items: z.number().int().min(1).max(10000).default(1000).describe('Max articles to check'),
      tag_only: z.boolean().default(false).describe('Only tag as no_body_crawl, don\'t delete vectors')
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
    description: 'Scan news bodies using scientific quality metrics (link density, text density, stopword ratio, etc). Remove bodies below quality threshold.',
    inputSchema: z.object({
      dry_run: z.boolean().default(true).describe('Preview without making changes'),
      max_items: z.number().int().min(1).max(10000).default(1000).describe('Max articles to check'),
      quality_threshold: z.number().min(0).max(1).default(0.35).describe('Quality score threshold (0.0-1.0)')
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
    description: 'Get current news_articles schema and indexes for debugging.',
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
    description: 'Get audit log of all data operations (ingested, deleted, tagged, etc).',
    inputSchema: z.object({
      article_id: z.string().optional().describe('Filter by article ID'),
      action: z.string().optional().describe('Filter by action (ingested, deleted, tagged_topic, etc)'),
      days: z.number().int().min(1).max(365).optional().describe('Time period in days'),
      limit: z.number().int().min(1).max(10000).default(1000).describe('Max entries to return')
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
    description: 'Find potential duplicate articles (same URL).',
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
    description: 'Get comprehensive data quality and coverage metrics.',
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
    description: 'Get audit statistics (action counts by type).',
    inputSchema: z.object({
      days: z.number().int().min(1).max(365).default(30).describe('Time period in days')
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
    description: 'Re-fetch bodies for articles that have no body AND are not tagged as no_body_crawl.',
    inputSchema: z.object({
      max_items: z.number().int().min(1).max(1000).default(100).describe('Max articles to process'),
      dry_run: z.boolean().default(false).describe('Preview without fetching')
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
    description: 'List all available data adapters.',
    inputSchema: z.object({
      category: z.string().optional().describe('Filter by category')
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
    description: 'Get live progress of a backfill job.',
    inputSchema: z.object({
      job_id: z.string().describe('Job ID to monitor')
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

