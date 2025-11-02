import { z } from 'zod';
import { callCoalesence, callOrchestrator } from '../api-client.js';
import { logger } from '../../logger.js';

export const listRulesTool = {
  name: 'list-rules',
  config: {
    title: 'List Rules',
    description: 'List all available rules in the system. Rules are reusable prompt instruction templates that can be attached to agent turns. Rules provide consistent guidance across multiple agents (e.g., "incremental processing pattern", "telegram notification guidelines"). Returns rule IDs, names, descriptions, and metadata. Use this to discover available rules before configuring agent turns, or to understand what prompt patterns are available. Rules can be referenced by ID in agent turn configurations.',
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
    description: 'Get a single rule by its ID. Returns full rule content (the prompt instruction text), name, description, and metadata. Use this to inspect rule content before attaching to agent turns, or to review existing rules. Rules contain reusable prompt patterns that guide agent behavior. Returns 404 if rule not found.',
    inputSchema: z.object({
      id: z.string().describe('Rule ID (e.g., "rule_1761997792538_k64icduvb"). Get IDs from list-rules.')
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
    description: 'Create a new reusable rule for prompt instructions. Rules can be attached to multiple agent turns to provide consistent guidance. Rules should contain reusable patterns (e.g., "always check duplicates before creating", "use batch operations for efficiency"). Keep rules focused, goal-oriented, and applicable across agents. Rule name must be unique. Returns created rule with ID. Use the rule ID in agent turn configurations.',
    inputSchema: z.object({
      name: z.string().describe('Unique rule name (e.g., "incremental_processing_pattern", "telegram_notification_professional"). Must be unique across all rules.'),
      content: z.string().describe('Rule content - the actual prompt instruction text that will be injected into agent turns. Keep concise and goal-oriented.'),
      description: z.string().optional().describe('Optional description explaining what this rule does and when to use it. Helps with rule discovery and understanding.')
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
    description: 'Update an existing rule by its ID. All fields are optional - only provided fields will be updated. Rule content changes will apply to all agent turns that reference this rule. Use this to refine rule instructions, update names/descriptions, or fix issues. Returns updated rule. Note: Content changes affect all agents using this rule immediately.',
    inputSchema: z.object({
      id: z.string().describe('Rule ID to update. Get IDs from list-rules.'),
      name: z.string().optional().describe('New rule name. Must be unique if changed.'),
      content: z.string().optional().describe('New rule content (prompt instruction). Changes apply to all agent turns using this rule.'),
      description: z.string().optional().describe('New rule description. Updates metadata only, does not affect functionality.')
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
    description: 'Delete a rule by its ID. WARNING: This permanently removes the rule and will remove it from all agent turns that reference it. Agents will continue to function but will lose the guidance provided by this rule. Use update-rule to modify instead of delete if possible. Returns deletion confirmation. Action is irreversible.',
    inputSchema: z.object({
      id: z.string().describe('Rule ID to delete. Get IDs from list-rules. WARNING: Removes rule from all agent turns.')
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

