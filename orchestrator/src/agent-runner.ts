import { query } from '@anthropic-ai/claude-agent-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';
import { TokenBudgetManager } from './token-budget.js';
import type { AgentConfig, TurnConfig } from './types.js';
import { getModelId } from './model-mapper.js';
import { OrchestrationDB } from './db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MCPConfig {
  [key: string]: {
    type: 'http';
    url: string;
    description?: string;
  };
}

// Build MCP server configurations for Claude Agent SDK
function buildMCPServersConfig(config: AgentConfig, mcpConfig: MCPConfig): Record<string, any> {
  const mcpServers: Record<string, any> = {};

  // Collect unique MCPs used across all turns
  const usedMCPs = new Set<string>();
  for (const turn of config.turns) {
    if (turn.mcps) {
      for (const mcpName of turn.mcps) {
        usedMCPs.add(mcpName);
      }
    }
  }

  // Build config for each used MCP (HTTP only)
  for (const mcpName of usedMCPs) {
    const mcp = mcpConfig[mcpName];
    if (!mcp || mcp.type !== 'http') {
      logger.warn({ mcpName }, 'MCP not found or not HTTP type, skipping');
      continue;
    }

    mcpServers[mcpName] = {
      url: mcp.url
    };
  }

  return mcpServers;
}

// Filter MCPs for specific turn
function filterMCPServers(allMCPs: Record<string, any>, turnMCPs?: string[]): Record<string, any> {
  if (!turnMCPs || turnMCPs.length === 0) {
    return {};
  }
  
  const filtered: Record<string, any> = {};
  for (const mcpName of turnMCPs) {
    if (allMCPs[mcpName]) {
      filtered[mcpName] = allMCPs[mcpName];
    }
  }
  return filtered;
}

// Build system prompt with step control guidance
function buildSystemPrompt(config: AgentConfig, turn: TurnConfig): string {
  const basePrompt = config.system_prompt || '';
  
  const stepControl = `
## Response Guidelines
- Make 3-5 focused tool calls per response, then analyze
- After each tool call, briefly reflect on what you learned
- If you have enough information to complete the turn, provide a summary
- Be efficient and avoid redundant queries
- Use JSON schemas correctly for all tool calls
`;

  return basePrompt + '\n' + stepControl;
}

// Convert cost to USD based on model pricing
function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Haiku 3.5 pricing
  if (model.includes('haiku-3.5')) {
    return (inputTokens * 0.00080 + outputTokens * 0.0024) / 1000;
  }
  // Haiku 4.5 pricing
  if (model.includes('haiku-4.5')) {
    return (inputTokens * 0.00080 + outputTokens * 0.0024) / 1000;
  }
  // Sonnet 4.5 pricing
  if (model.includes('sonnet-4.5')) {
    return (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
  }
  // Opus 4.1 pricing
  if (model.includes('opus-4.1')) {
    return (inputTokens * 0.015 + outputTokens * 0.075) / 1000;
  }
  return 0;
}

export async function runAgent(
  config: AgentConfig,
  mcpConfig: MCPConfig,
  db: OrchestrationDB,
  tokenBudget?: TokenBudgetManager
): Promise<{ runId: string; status: string; totalTokens: number; cost: number }> {
  const runId = randomUUID();
  const startTime = Date.now();

  try {
    // Initialize run
    db.insertRun({
      id: runId,
      agent: config.agent || 'unknown',
      status: 'running',
      created_at: new Date().toISOString(),
      turns_total: config.turns.length,
      turns_completed: 0
    });

    logger.info({ runId, agent: config.agent }, 'Starting agent run');

    // Setup MCP servers
    const mcpServers = buildMCPServersConfig(config, mcpConfig);
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalToolCalls = 0;

    // Run turns sequentially
    for (let turnIdx = 0; turnIdx < config.turns.length; turnIdx++) {
      const turnNumber = turnIdx + 1;
      const turn = config.turns[turnIdx];

      logger.info({ runId, turnNumber, turnName: turn.name }, 'Starting turn');

      // Initialize turn
      db.insertTurnDetails(runId, turnNumber, turn.name, 'pending');

      const turnMCPs = filterMCPServers(mcpServers, turn.mcps);
      const systemPrompt = buildSystemPrompt(config, turn);
      const model = getModelId(turn.model || config.model);

      let turnInputTokens = 0;
      let turnOutputTokens = 0;
      let turnToolCalls = 0;
      let turnResponse = '';

      try {
        // Call Claude Agent SDK
        for await (const chunk of query({
          prompt: turn.prompt,
          systemPrompt: systemPrompt,
          model: model,
          maxTokens: turn.max_tokens || config.max_tokens_per_turn || 4000,
          mcpServers: turnMCPs
        })) {
          // Handle text chunks
          if (chunk.type === 'text') {
            turnResponse += chunk.text;
            await db.insertMessage(runId, turnNumber, 'assistant', chunk.text);
          }

          // Handle tool use
          if (chunk.type === 'tool_use') {
            const toolStart = Date.now();
            
            await db.insertToolCallComplete(
              runId,
              turnNumber,
              chunk.tool_name,
              chunk.tool_input || {},
              chunk.tool_output || {},
              Date.now() - toolStart,
              'success'
            );

            turnToolCalls++;
            logger.debug(
              { toolName: chunk.tool_name, durationMs: Date.now() - toolStart },
              'Tool executed'
            );
          }

          // Handle usage
          if (chunk.type === 'usage') {
            turnInputTokens = chunk.usage.input_tokens || 0;
            turnOutputTokens = chunk.usage.output_tokens || 0;
          }
        }

        totalInputTokens += turnInputTokens;
        totalOutputTokens += turnOutputTokens;
        totalToolCalls += turnToolCalls;

        const turnCost = calculateCost(turnInputTokens, turnOutputTokens, model);

        // Complete turn
        db.completeTurnDetails(
          runId,
          turnNumber,
          turnInputTokens,
          turnOutputTokens,
          turnCost,
          turnToolCalls,
          'success'
        );

        logger.info(
          {
            turnNumber,
            tokens: turnInputTokens + turnOutputTokens,
            toolCalls: turnToolCalls,
            cost: turnCost
          },
          'Turn completed'
        );

      } catch (turnError: any) {
        const errorMsg = turnError?.message || String(turnError);
        
        db.completeTurnDetails(
          runId,
          turnNumber,
          turnInputTokens,
          turnOutputTokens,
          0,
          turnToolCalls,
          'error',
          errorMsg
        );

        logger.error({ turnNumber, error: errorMsg }, 'Turn failed');
        throw turnError;
      }
    }

    // Calculate total cost
    const totalCost = calculateCost(totalInputTokens, totalOutputTokens, config.model);
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Complete run
    db.updateRun(runId, {
      status: 'success',
      finished_at: new Date().toISOString(),
      duration_seconds: duration,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      total_tokens: totalInputTokens + totalOutputTokens,
      cost_usd: totalCost,
      turns_completed: config.turns.length,
      model_used: config.model
    });

    logger.info(
      {
        runId,
        duration,
        tokens: totalInputTokens + totalOutputTokens,
        toolCalls: totalToolCalls,
        cost: totalCost,
        status: 'success'
      },
      'Agent run completed'
    );

    return {
      runId,
      status: 'success',
      totalTokens: totalInputTokens + totalOutputTokens,
      cost: totalCost
    };

  } catch (error: any) {
    const errorMsg = error?.message || String(error);

    db.updateRun(runId, {
      status: 'error',
      finished_at: new Date().toISOString(),
      error_message: errorMsg
    });

    logger.error({ runId, error: errorMsg }, 'Agent run failed');

    return {
      runId,
      status: 'error',
      totalTokens: 0,
      cost: 0
    };
  }
}
