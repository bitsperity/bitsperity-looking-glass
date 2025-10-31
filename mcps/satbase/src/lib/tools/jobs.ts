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
    description: 'List background ingestion jobs with status and progress.',
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
    description: 'Get detailed information about a specific ingestion job.',
    inputSchema: z.object({
      job_id: z.string().describe('Job ID to retrieve')
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
    description: 'Mark and clean jobs stuck in running state (after server restart).',
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
    description: 'Cancel/delete a running or stuck job.',
    inputSchema: z.object({ job_id: z.string() }).shape,
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
    description: 'Retry a failed job by creating a new job with the same payload.',
    inputSchema: z.object({
      job_id: z.string().describe('Job ID to retry')
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
    description: 'List all jobs with optional filters (status, job_type). Perfect for frontend monitoring.',
    inputSchema: z.object({
      status: z.enum(['queued', 'running', 'done', 'error']).optional().describe('Filter by status'),
      job_type: z.string().optional().describe('Filter by job type'),
      limit: z.number().int().min(1).max(1000).default(100).describe('Maximum number of jobs')
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
    description: 'Get overall job statistics (success rate, avg duration, etc.).',
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

