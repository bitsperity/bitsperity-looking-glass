import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const listAgentsTool = {
  name: 'list-agents',
  config: {
    title: 'List Agents',
    description: 'List all agent configurations.',
    inputSchema: z.object({}).shape,
  },
  handler: async () => {
    logger.info({ tool: 'coalescence_list-agents' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>('/v1/agents', {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_list-agents', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_list-agents', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getAgentTool = {
  name: 'get-agent',
  config: {
    title: 'Get Agent',
    description: 'Get agent configuration by name.',
    inputSchema: z.object({
      name: z.string().describe('Agent name')
    }).shape,
  },
  handler: async (input: { name: string }) => {
    logger.info({ tool: 'coalescence_get-agent', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>(`/v1/agents/${input.name}`, {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_get-agent', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_get-agent', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const createAgentTool = {
  name: 'create-agent',
  config: {
    title: 'Create Agent',
    description: 'Create a new agent configuration.',
    inputSchema: z.object({
      name: z.string().describe('Agent name'),
      enabled: z.boolean().default(true).describe('Whether agent is enabled'),
      model: z.string().describe('Model to use (e.g., haiku-3.5)'),
      schedule: z.string().describe('Cron schedule expression'),
      system_prompt: z.string().optional().describe('System prompt'),
      max_tokens_per_turn: z.number().optional().describe('Max tokens per turn'),
      max_steps: z.number().default(5).describe('Max agentic loop steps'),
      budget_daily_tokens: z.number().describe('Daily token budget'),
      timeout_minutes: z.number().describe('Timeout in minutes'),
      turns: z.array(z.any()).describe('Turn configurations')
    }).shape,
  },
  handler: async (input: any) => {
    logger.info({ tool: 'coalescence_create-agent', name: input.name }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>('/v1/agents', {
        method: 'POST',
        body: JSON.stringify(input),
      }, 15000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_create-agent', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_create-agent', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const updateAgentTool = {
  name: 'update-agent',
  config: {
    title: 'Update Agent',
    description: 'Update an existing agent configuration.',
    inputSchema: z.object({
      name: z.string().describe('Agent name'),
      enabled: z.boolean().optional().describe('Whether agent is enabled'),
      model: z.string().optional().describe('Model to use'),
      schedule: z.string().optional().describe('Cron schedule expression'),
      system_prompt: z.string().optional().describe('System prompt'),
      max_tokens_per_turn: z.number().optional().describe('Max tokens per turn'),
      max_steps: z.number().optional().describe('Max agentic loop steps'),
      budget_daily_tokens: z.number().optional().describe('Daily token budget'),
      timeout_minutes: z.number().optional().describe('Timeout in minutes'),
      turns: z.array(z.any()).optional().describe('Turn configurations')
    }).shape,
  },
  handler: async (input: any) => {
    logger.info({ tool: 'coalescence_update-agent', name: input.name }, 'Tool invoked');
    const start = performance.now();

    try {
      const { name, ...updates } = input;
      const result = await callCoalesence<any>(`/v1/agents/${name}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }, 15000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_update-agent', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_update-agent', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const deleteAgentTool = {
  name: 'delete-agent',
  config: {
    title: 'Delete Agent',
    description: 'Delete an agent configuration.',
    inputSchema: z.object({
      name: z.string().describe('Agent name')
    }).shape,
  },
  handler: async (input: { name: string }) => {
    logger.info({ tool: 'coalescence_delete-agent', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>(`/v1/agents/${input.name}`, {
        method: 'DELETE',
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_delete-agent', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_delete-agent', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

