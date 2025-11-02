import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  ListJobsRequestSchema,
  ListJobsResponseSchema,
  GetJobResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const listJobsTool = {
  name: 'list-jobs',
  config: {
    title: 'List Background Jobs',
    description: 'List background ingestion jobs (news, prices, macro data) with status (queued, running, done, error) and progress information. Filter by status to find specific job states. Returns job IDs, types, status, timestamps, and progress. Essential for monitoring data ingestion, checking job completion, or identifying failed jobs. Use get-job for detailed information about a specific job.',
    inputSchema: ListJobsRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof ListJobsRequestSchema>) => {
    logger.info({ tool: 'list-jobs', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        limit: input.limit.toString()
      });

      if (input.status) params.append('status', input.status);

      const result = await callSatbase<z.infer<typeof ListJobsResponseSchema>>(
        `/v1/ingest/jobs?${params.toString()}`,
        {},
        10000 // Fast query, 10 seconds timeout
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'list-jobs', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'list-jobs', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getJobTool = {
  name: 'get-job',
  config: {
    title: 'Get Job Details',
    description: 'Get detailed information about a specific background ingestion job by job_id. Returns full job metadata including status, progress percentage, error messages (if failed), timestamps (created, started, completed), job type (news/prices/macro), parameters, and result summary. Use this to check job progress, debug failures, or verify completion. Returns 404 if job not found.',
    inputSchema: z.object({
      job_id: z.string().describe('Job ID to retrieve. Get job IDs from list-jobs or from ingestion response (enqueue-news, enqueue-prices, etc.).')
    }).shape,
  },
  handler: async (input: { job_id: string }) => {
    logger.info({ tool: 'get-job', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof GetJobResponseSchema>>(
        `/v1/ingest/jobs/${input.job_id}`,
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-job', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'get-job', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const cleanupJobsTool = {
  name: 'jobs-cleanup',
  config: {
    title: 'Cleanup Stale Jobs',
    description: 'Mark and clean jobs stuck in "running" state after server restart or crashes. When the server restarts, jobs that were running may remain stuck as "running" even though they\'re no longer executing. This tool identifies and marks them as failed or cleaned up. Returns count of cleaned jobs. Use this for maintenance after server restarts or to recover from job system issues.',
    inputSchema: z.object({}).shape,
  },
  handler: async () => {
    logger.info({ tool: 'jobs-cleanup' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/ingest/jobs/cleanup',
        { method: 'POST' },
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'jobs-cleanup', duration, cleaned: result.cleaned }, 'Tool completed');

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      logger.error({ tool: 'jobs-cleanup', error }, 'Tool failed');
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
};

export const cancelJobTool = {
  name: 'jobs-cancel',
  config: {
    title: 'Cancel Job',
    description: 'Cancel or delete a running or stuck background job by job_id. Stops execution if job is still running, or removes it if stuck. Useful for stopping long-running jobs that are no longer needed, or cleaning up stuck jobs that cleanup-jobs didn\'t handle. Returns cancellation confirmation. Note: Cancelled jobs cannot be resumed - use job-retry to restart if needed.',
    inputSchema: z.object({ 
      job_id: z.string().describe('Job ID to cancel. Get job IDs from list-jobs.')
    }).shape,
  },
  handler: async (input: { job_id: string }) => {
    logger.info({ tool: 'jobs-cancel', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/ingest/jobs/${input.job_id}`,
        { method: 'DELETE' },
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'jobs-cancel', duration, status: result.status }, 'Tool completed');

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      logger.error({ tool: 'jobs-cancel', error }, 'Tool failed');
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
};

export const retryJobTool = {
  name: 'job-retry',
  config: {
    title: 'Retry Failed Job',
    description: 'Retry a failed job by creating a new job with the same payload/parameters as the original. Useful for recovering from transient failures (network issues, API rate limits, etc.). Creates a new job_id and starts fresh execution. Returns new job ID and status. Use this after investigating why a job failed and ensuring the issue is resolved.',
    inputSchema: z.object({
      job_id: z.string().describe('Job ID of failed job to retry. Get from list-jobs filtered by status="error".')
    }).shape
  },
  handler: async (input: { job_id: string }) => {
    logger.info({ tool: 'job-retry', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/admin/jobs/${input.job_id}/retry`,
        { method: 'POST' },
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'job-retry', duration, new_job: result.new_job }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'job-retry', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const adminJobsTool = {
  name: 'admin-jobs',
  config: {
    title: 'List Admin Jobs',
    description: 'List all background jobs with comprehensive filtering options (status, job_type). Returns jobs with full metadata. Perfect for frontend monitoring dashboards, admin interfaces, or comprehensive job management. More detailed than list-jobs. Filter by status (queued/running/done/error) and/or job_type (news/prices/macro) to narrow results. Default limit 100, max 1000.',
    inputSchema: z.object({
      status: z.enum(['queued', 'running', 'done', 'error']).optional().describe('Filter by job status: queued (waiting), running (executing), done (completed successfully), error (failed).'),
      job_type: z.string().optional().describe('Filter by job type (e.g., "news", "prices", "macro", "backfill").'),
      limit: z.number().int().min(1).max(1000).default(100).describe('Maximum number of jobs to return. Default 100, max 1000.')
    }).shape
  },
  handler: async (input: { status?: string; job_type?: string; limit?: number }) => {
    logger.info({ tool: 'admin-jobs', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        limit: (input.limit || 100).toString()
      });
      if (input.status) params.append('status', input.status);
      if (input.job_type) params.append('job_type', input.job_type);

      const result = await callSatbase<any>(
        `/v1/admin/jobs?${params.toString()}`,
        {},
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'admin-jobs', duration, total: result.total }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'admin-jobs', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const adminJobsStatsTool = {
  name: 'admin-jobs-stats',
  config: {
    title: 'Get Job Statistics',
    description: 'Get overall job system statistics including success rate, average job duration, job counts by status/type, failure rates, and performance metrics. Useful for monitoring job system health, identifying performance trends, or generating admin dashboards. Returns aggregated statistics across all jobs.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'admin-jobs-stats' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/admin/jobs/stats',
        {},
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'admin-jobs-stats', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'admin-jobs-stats', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

