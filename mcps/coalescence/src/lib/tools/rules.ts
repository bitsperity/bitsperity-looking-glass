import { z } from 'zod';
import { callCoalesence, callOrchestrator } from '../api-client.js';
import { logger } from '../../logger.js';

export const listRulesTool = {
  name: 'list-rules',
  config: {
    title: 'List Rules',
    description: 'List all available rules. Rules are reusable prompt instructions that can be attached to agent turns.',
    inputSchema: z.object({}).shape,
  },
  handler: async () => {
    logger.info({ tool: 'coalescence_list-rules' }, 'Tool invoked');
    const start = performance.now();

    try {
      // Rules are stored in orchestrator API
      const result = await callOrchestrator<any>('/api/rules', {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_list-rules', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_list-rules', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getRuleTool = {
  name: 'get-rule',
  config: {
    title: 'Get Rule',
    description: 'Get a single rule by its ID.',
    inputSchema: z.object({
      id: z.string().describe('Rule ID')
    }).shape,
  },
  handler: async (input: { id: string }) => {
    logger.info({ tool: 'coalescence_get-rule', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callOrchestrator<any>(`/api/rules/${input.id}`, {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_get-rule', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_get-rule', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const createRuleTool = {
  name: 'create-rule',
  config: {
    title: 'Create Rule',
    description: 'Create a new rule. Rules are reusable prompt instructions that can be attached to agent turns.',
    inputSchema: z.object({
      name: z.string().describe('Rule name (must be unique)'),
      content: z.string().describe('Rule content (the actual instruction/prompt)'),
      description: z.string().optional().describe('Optional description of what this rule does')
    }).shape,
  },
  handler: async (input: { name: string; content: string; description?: string }) => {
    logger.info({ tool: 'coalescence_create-rule', input: { name: input.name } }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callOrchestrator<any>('/api/rules', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          content: input.content,
          description: input.description
        })
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_create-rule', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_create-rule', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const updateRuleTool = {
  name: 'update-rule',
  config: {
    title: 'Update Rule',
    description: 'Update an existing rule by its ID.',
    inputSchema: z.object({
      id: z.string().describe('Rule ID'),
      name: z.string().optional().describe('New rule name'),
      content: z.string().optional().describe('New rule content'),
      description: z.string().optional().describe('New rule description')
    }).shape,
  },
  handler: async (input: { id: string; name?: string; content?: string; description?: string }) => {
    logger.info({ tool: 'coalescence_update-rule', input: { id: input.id } }, 'Tool invoked');
    const start = performance.now();

    try {
      const body: any = {};
      if (input.name !== undefined) body.name = input.name;
      if (input.content !== undefined) body.content = input.content;
      if (input.description !== undefined) body.description = input.description;

      const result = await callOrchestrator<any>(`/api/rules/${input.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_update-rule', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_update-rule', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const deleteRuleTool = {
  name: 'delete-rule',
  config: {
    title: 'Delete Rule',
    description: 'Delete a rule by its ID. WARNING: This will remove the rule from all agent turns that use it.',
    inputSchema: z.object({
      id: z.string().describe('Rule ID to delete')
    }).shape,
  },
  handler: async (input: { id: string }) => {
    logger.info({ tool: 'coalescence_delete-rule', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callOrchestrator<any>(`/api/rules/${input.id}`, {
        method: 'DELETE'
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_delete-rule', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_delete-rule', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

