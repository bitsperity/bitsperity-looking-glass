import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const listAgentsTool = {
  name: 'list-agents',
  config: {
    title: 'List Agents',
    description: 'List all agent configurations in the system. Returns agent metadata including name, enabled status, model, schedule (cron expression), turn configurations, run statistics (total runs, last run time, total tokens, total cost), and configuration details. Essential for understanding what agents exist, their schedules, status, and performance. Use this to get agent names before calling get-agent, trigger-agent, or other agent-specific operations.',
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
    description: 'Get complete agent configuration by agent name. Returns full configuration including system prompt, model settings, schedule (cron), all turn configurations with prompts and tools, budget settings, timeout, max steps, and run statistics. Use this to inspect agent configuration before updating, understand agent behavior, or verify settings. Returns 404 if agent not found.',
    inputSchema: z.object({
      name: z.string().describe('Agent name (e.g., "daily-news-analyst", "manifold-knowledge-curator"). Must match exact agent name.')
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
    description: 'Create a new agent configuration. Agents are autonomous AI workers that execute scheduled or triggered tasks using tools from MCPs (Manifold, Satbase, Tesseract, etc.). Requires name (unique), model (e.g., "haiku-3.5", "sonnet-4"), schedule (cron expression like "0 8 * * *" for daily 8 AM), turns array (each turn has prompt, tools, rules), and budget/timeout settings. System prompt defines agent identity and goals. Turns define sequential execution steps. Returns created agent with ID and configuration.',
    inputSchema: z.object({
      name: z.string().describe('Unique agent name (e.g., "daily-news-analyst"). Must be unique across all agents.'),
      enabled: z.boolean().default(true).describe('Whether agent is enabled and will execute on schedule. false = disabled but configuration preserved.'),
      model: z.string().describe('Anthropic model to use: "haiku-3.5" (fast, cost-effective), "sonnet-4" (more capable), etc.'),
      schedule: z.string().describe('Cron schedule expression (e.g., "0 8 * * *" = daily 8 AM, "0 */6 * * *" = every 6 hours). Use "manual" for no automatic scheduling.'),
      system_prompt: z.string().optional().describe('System prompt defining agent identity, role, and core principles. Keep concise and goal-oriented.'),
      max_tokens_per_turn: z.number().optional().describe('Maximum tokens per turn (input + output). Prevents runaway token usage.'),
      max_steps: z.number().default(5).describe('Maximum agentic loop steps per turn. Default 5. Higher = more autonomous exploration but more tokens.'),
      budget_daily_tokens: z.number().describe('Daily token budget limit. Agent will stop if exceeded. Set based on expected workload and cost constraints.'),
      timeout_minutes: z.number().describe('Maximum execution time in minutes. Agent run will timeout after this duration.'),
      turns: z.array(z.any()).describe('Array of turn configurations. Each turn has: id (0-N), prompt (turn instructions), tools (available MCP tools), rules (prompt rules to apply). Turns execute sequentially.')
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
    description: 'Partially update an existing agent configuration. All fields are optional - only provided fields will be updated. Useful for adjusting prompts, enabling/disabling, changing schedules, updating budgets, or modifying turn configurations. Changes take effect on next run (for schedule changes) or immediately (for enabled/disabled). Returns updated agent configuration.',
    inputSchema: z.object({
      name: z.string().describe('Agent name to update (must match existing agent).'),
      enabled: z.boolean().optional().describe('Enable (true) or disable (false) the agent. Disabled agents will not execute on schedule.'),
      model: z.string().optional().describe('Change model (e.g., "haiku-3.5" to "sonnet-4").'),
      schedule: z.string().optional().describe('Update cron schedule expression. Changes take effect on next scheduler cycle.'),
      system_prompt: z.string().optional().describe('Update system prompt. New prompt applies to next run.'),
      max_tokens_per_turn: z.number().optional().describe('Update max tokens per turn limit.'),
      max_steps: z.number().optional().describe('Update max agentic loop steps per turn.'),
      budget_daily_tokens: z.number().optional().describe('Update daily token budget.'),
      timeout_minutes: z.number().optional().describe('Update timeout in minutes.'),
      turns: z.array(z.any()).optional().describe('Update turn configurations. Replace entire turns array - partial updates not supported.')
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
    description: 'Delete an agent configuration permanently. This removes the agent from the system - it will no longer execute, and configuration is lost. WARNING: This action is irreversible. Run history and statistics may be preserved but agent configuration is deleted. Use enabled=false via update-agent if you want to temporarily disable without deleting. Returns deletion confirmation.',
    inputSchema: z.object({
      name: z.string().describe('Agent name to delete. Must match existing agent name exactly.')
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

export const triggerAgentTool = {
  name: 'trigger-agent',
  config: {
    title: 'Trigger Agent',
    description: 'Manually trigger an agent run immediately, bypassing the schedule. Starts a new execution of the agent right away with full turn sequence. Useful for testing agent changes, running ad-hoc analysis, or triggering urgent tasks. Returns run ID and status. Agent will execute all configured turns sequentially. Note: Agent must be enabled. Use this instead of waiting for scheduled execution.',
    inputSchema: z.object({
      name: z.string().describe('Agent name to trigger (e.g., "daily-news-analyst"). Agent must exist and be enabled.')
    }).shape,
  },
  handler: async (input: { name: string }) => {
    logger.info({ tool: 'coalescence_trigger-agent', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>(`/v1/agents/${input.name}/trigger`, {
        method: 'POST',
      }, 30000); // Longer timeout for agent runs

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_trigger-agent', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_trigger-agent', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

