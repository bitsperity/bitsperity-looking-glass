import { query, type ClaudeAgentOptions } from 'claude-agent-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';
import { TokenBudgetManager } from './token-budget.js';
import type { AgentConfig, TurnConfig, ChatMessage, AgentRun } from './types.js';
import { getModelId } from './model-mapper.js';
import { OrchestrationLogger } from './orchestration-logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build allowed_tools list from agent's MCP configurations
function buildAllowedToolsList(config: AgentConfig): string[] {
  const allowedTools: Set<string> = new Set();

  for (const turn of config.turns) {
    if (!turn.mcps) continue;

    for (const mcp of turn.mcps) {
      // Discover tools from MCP - for now, allow all tools from enabled MCPs
      // Format: "mcp__{mcpName}__{toolName}"
      // This will be populated dynamically by Claude Agent SDK
    }
  }

  // Return empty array to allow all tools (Claude Agent SDK will filter via allowed_tools in options)
  return [];
}

// Build MCP server configurations for Claude Agent SDK
function buildMCPServerConfigs(
  config: AgentConfig,
  mcpServersConfig: Record<string, any>
): Record<string, any> {
  const mcpConfigs: Record<string, any> = {};

  // Collect unique MCPs used across all turns
  const usedMCPs = new Set<string>();
  for (const turn of config.turns) {
    if (turn.mcps) {
      for (const mcp of turn.mcps) {
        usedMCPs.add(mcp);
      }
    }
  }

  // Build config for each used MCP
  for (const mcpName of usedMCPs) {
    const mcpConfig = mcpServersConfig[mcpName];
    if (!mcpConfig) {
      logger.warn({ mcpName }, 'MCP server config not found');
      continue;
    }

    mcpConfigs[mcpName] = {
      command: mcpConfig.command,
      args: mcpConfig.args,
      env: mcpConfig.env
    };
  }

  return mcpConfigs;
}

// Build turn prompt with context
async function buildTurnPrompt(
  turn: TurnConfig,
  rulesContent: string,
  chatHistory: ChatMessage[],
  agentName: string
): Promise<string> {
  let prompt = '';

  // Agent rules first
  if (rulesContent) {
    prompt += rulesContent + '\n\n---\n\n';
  }

  // Chat history as context
  if (chatHistory.length > 0) {
    prompt += 'Previous conversation:\n';
    prompt += chatHistory
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 500)}...`)
      .join('\n\n');
    prompt += '\n\n---\n\n';
  }

  // Turn-specific prompt
  prompt += `Turn: ${turn.name}\n`;
  if (turn.prompt) {
    prompt += turn.prompt;
  }

  return prompt;
}

export async function runAgent(
  agentName: string,
  config: AgentConfig,
  mcpServersConfig: Record<string, any>,
  budget: TokenBudgetManager
): Promise<AgentRun> {
  const startTime = Date.now();
  const runId = `${agentName}__${new Date().toISOString().replace(/[:.]/g, '-')}__${randomUUID().substring(0, 8)}`;

  // Initialize logging system
  const dbPath = path.join(__dirname, '..', 'logs', 'orchestration.db');
  const orchestrationLogger = new OrchestrationLogger(dbPath);

  await orchestrationLogger.logRunStart(agentName, runId);

  logger.info({ agent: agentName, runId }, 'Starting agent run');

  const chatHistory: ChatMessage[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Load agent rules (optional)
  const rulesContent = config.rules_file
    ? await fs.readFile(config.rules_file, 'utf-8').catch(() => '')
    : '';

  try {
    // Build MCP server configurations
    const mcpConfigs = buildMCPServerConfigs(config, mcpServersConfig);

    // Get model ID
    const modelId = await getModelId(config.model);

    // Build allowed tools list - we'll use all tools from enabled MCPs
    // Claude Agent SDK will handle tool discovery
    const allowedTools: string[] = [];

    // Process each turn sequentially
    for (const [turnIndex, turn] of config.turns.entries()) {
      const turnNumber = turnIndex + 1;
      logger.info({ agent: agentName, turn: turn.id, name: turn.name }, 'Starting turn');
      await orchestrationLogger.logTurnStart(runId, turnNumber, turn.name);

      try {
        // Build turn prompt
        const turnPrompt = await buildTurnPrompt(turn, rulesContent, chatHistory, agentName);

        // Prepare Claude Agent SDK options
        // Note: callbacks will be called by SDK when tools are invoked
        const options: ClaudeAgentOptions = {
          model: modelId,
          mcp_servers: mcpConfigs,
          allowed_tools: allowedTools.length > 0 ? allowedTools : undefined
          // callbacks will be handled inline below
        };

        logger.info({ agent: agentName, turn: turn.name }, 'Calling Claude Agent SDK query');

        // Call Claude Agent SDK - this will handle MCP tool discovery and execution
        const response = await query(turnPrompt, options);

        // Log user prompt
        await orchestrationLogger.logMessage(runId, turnNumber, 'user', turnPrompt);

        // Log assistant response
        await orchestrationLogger.logMessage(runId, turnNumber, 'assistant', response.text, {
          input: response.usage?.input_tokens,
          output: response.usage?.output_tokens
        });

        // Track tokens
        const inputTokens = response.usage?.input_tokens ?? 0;
        const outputTokens = response.usage?.output_tokens ?? 0;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        logger.info(
          {
            agent: agentName,
            turn: turn.id,
            inputTokens,
            outputTokens,
            totalInputSoFar: totalInputTokens,
            totalOutputSoFar: totalOutputTokens
          },
          'Turn completed'
        );

        // Add to chat history for next turn
        chatHistory.push({
          role: 'user',
          content: turnPrompt
        });
        chatHistory.push({
          role: 'assistant',
          content: response.text
        });

        // Record cost
        const cost = await budget.calculateCost(inputTokens, outputTokens, config.model);
        await orchestrationLogger.logTurnCost(runId, turnNumber, agentName, config.model, inputTokens, outputTokens, cost);
      } catch (error) {
        const errorInfo: any = {
          agent: agentName,
          turn: turn.id,
          model: config.model
        };

        if (error instanceof Error) {
          errorInfo.errorName = error.name;
          errorInfo.errorMessage = error.message;
          errorInfo.errorStack = error.stack?.split('\n').slice(0, 5);
        } else {
          errorInfo.errorValue = String(error).substring(0, 200);
        }

        logger.error(errorInfo, 'Turn execution failed');
        await orchestrationLogger.logMessage(
          runId,
          turnNumber,
          'system',
          `ERROR: Turn failed: ${errorInfo.errorMessage}`
        );

        throw error;
      }
    }

    // Record final budget usage
    const totalTokens = totalInputTokens + totalOutputTokens;
    budget.record(agentName, totalTokens);

    const cost = await budget.calculateCost(totalInputTokens, totalOutputTokens, config.model);
    const durationSeconds = (Date.now() - startTime) / 1000;

    await orchestrationLogger.logRunFinish(runId, 'completed', durationSeconds, cost);

    logger.info(
      {
        agent: agentName,
        runId,
        status: 'completed',
        duration: durationSeconds,
        tokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalTokens,
          cost_usd: cost
        }
      },
      'Agent run finished'
    );

    return {
      agent: agentName,
      runId,
      status: 'completed',
      tokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalTokens,
        cost_usd: cost
      },
      duration: durationSeconds,
      turns_completed: config.turns.length
    };
  } catch (error) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    logger.error(
      {
        agent: agentName,
        runId,
        error: error instanceof Error ? error.message : String(error),
        duration: durationSeconds
      },
      'Agent run failed'
    );

    await orchestrationLogger.logRunFinish(runId, 'failed', durationSeconds, 0);

    throw error;
  }
}
