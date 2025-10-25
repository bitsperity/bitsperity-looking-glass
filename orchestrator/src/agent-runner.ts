import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';
import { MCPPool } from './mcp-pool.js';
import { TokenBudgetManager } from './token-budget.js';
import type { AgentConfig, TurnConfig, ChatMessage, AgentRun } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Model selector - use gpt-4o-mini for testing (cheap!)
function selectModel(modelName: string) {
  const provider = process.env.LLM_PROVIDER || 'openai';
  
  if (provider === 'openai' || modelName.includes('gpt')) {
    // Use OpenAI for cost efficiency during testing
    // gpt-4o-mini: $0.15/$0.60 per 1M tokens (vs Haiku $1/$5, Sonnet $3/$15)
    const modelMap: Record<string, string> = {
      'claude-haiku-4-5': 'gpt-4o-mini',      // Swap for testing
      'claude-sonnet-4-5': 'gpt-4o',          // More capable for complex reasoning
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o': 'gpt-4o'
    };
    
    const mappedModel = modelMap[modelName] || 'gpt-4o-mini';
    logger.info({ originalModel: modelName, mappedModel, provider: 'openai' }, 'Model mapped');
    return openai(mappedModel, { apiKey: process.env.OPENAI_API_KEY });
  } else {
    return anthropic(modelName);
  }
}

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

  // Turn-specific prompt
  prompt += `## Turn ${turn.id}: ${turn.name}\n\n`;

  if (turn.prompt_file) {
    try {
      const fileContent = await fs.readFile(turn.prompt_file, 'utf-8');
      prompt += fileContent;
    } catch (error) {
      logger.warn({ agent: agentName, turn: turn.id, file: turn.prompt_file }, 'Prompt file not found');
      prompt += '(No prompt file found)\n';
    }
  } else if (turn.prompt) {
    prompt += turn.prompt;
  }

  // Context from previous turns
  if (chatHistory.length > 0) {
    prompt += '\n\n### Context from previous turns:\n';
    const context = chatHistory
      .slice(-4)
      .map((msg, i) => `${msg.role}: ${msg.content.substring(0, 500)}...`)
      .join('\n');
    prompt += context;
  }

  return prompt;
}

async function saveRunLog(run: AgentRun): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const logDir = path.join(__dirname, '..', 'logs', 'runs', date);
  await fs.mkdir(logDir, { recursive: true });

  const logFile = path.join(logDir, `${run.run_id}.jsonl`);
  await fs.appendFile(logFile, JSON.stringify(run) + '\n');
  logger.debug({ file: logFile }, 'Run log saved');
}

export async function runAgent(
  agentName: string,
  config: AgentConfig,
  mcpPool: MCPPool,
  budget: TokenBudgetManager
): Promise<AgentRun> {
  const startTime = Date.now();
  const runId = `${agentName}__${new Date().toISOString().replace(/[:.]/g, '-')}__${randomUUID().substring(0, 8)}`;

  logger.info({ agent: agentName, runId }, 'Starting agent run');

  const chatHistory: ChatMessage[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Load agent rules (optional)
  const rulesContent = config.rules_file
    ? await fs.readFile(config.rules_file, 'utf-8').catch(() => '')
    : '';

  try {
    for (const turn of config.turns) {
      logger.info({ agent: agentName, turn: turn.id, name: turn.name }, 'Starting turn');

      // Build turn prompt
      const turnPrompt = await buildTurnPrompt(turn, rulesContent, chatHistory, agentName);

      // Select model
      const modelName = turn.model || config.model;
      const model = selectModel(modelName);

      // Check budget
      if (!budget.canSpend(agentName, turn.max_tokens)) {
        logger.warn({ agent: agentName, turn: turn.id }, 'Budget exhausted, stopping');
        break;
      }

      // Get tools for this turn
      const tools =
        turn.mcps && turn.mcps.length > 0 ? await mcpPool.getTools(turn.mcps) : {};

      logger.debug(
        { agent: agentName, turn: turn.id, toolCount: Object.keys(tools).length },
        'Tools loaded'
      );

      // LLM call
      let result;
      try {
        result = await generateText({
          model,
          maxTokens: turn.max_tokens,
          prompt: turnPrompt,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          temperature: 0.7
        });
      } catch (error) {
        logger.error({ agent: agentName, turn: turn.id, error }, 'LLM call failed');
        throw error;
      }

      totalInputTokens += result.usage.promptTokens;
      totalOutputTokens += result.usage.completionTokens;

      // Record chat
      chatHistory.push({
        role: 'user',
        content: turnPrompt
      });

      chatHistory.push({
        role: 'assistant',
        content: result.text,
        tool_calls: result.toolCalls?.map(tc => ({
          toolName: tc.toolName,
          args: tc.args
        }))
      });

      logger.info(
        {
          agent: agentName,
          turn: turn.id,
          inputTokens: result.usage.promptTokens,
          outputTokens: result.usage.completionTokens,
          toolCalls: result.toolCalls?.length || 0
        },
        'Turn completed'
      );

      // Handle tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          try {
            logger.debug({ agent: agentName, tool: toolCall.toolName }, 'Calling tool');
            const toolResult = await mcpPool.callTool(toolCall.toolName, toolCall.args);

            chatHistory.push({
              role: 'user',
              content: `Tool ${toolCall.toolName} result: ${JSON.stringify(toolResult).substring(0, 1000)}`
            });

            logger.debug({ agent: agentName, tool: toolCall.toolName }, 'Tool call succeeded');
          } catch (error) {
            logger.error({ agent: agentName, tool: toolCall.toolName, error }, 'Tool call failed');
            chatHistory.push({
              role: 'user',
              content: `Tool ${toolCall.toolName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error({ agent: agentName, runId, error }, 'Agent run failed');
  }

  // Record budget
  const totalTokens = totalInputTokens + totalOutputTokens;
  budget.record(agentName, totalTokens);

  const cost = budget.calculateCost(totalInputTokens, totalOutputTokens, config.model);
  const durationSeconds = (Date.now() - startTime) / 1000;

  // Save run log
  const run: AgentRun = {
    run_id: runId,
    agent: agentName,
    timestamp: new Date().toISOString(),
    status: totalTokens > 0 ? 'completed' : 'failed',
    duration_seconds: durationSeconds,
    chat_history: chatHistory,
    outputs: {},
    tokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalTokens,
      cost_usd: cost
    }
  };

  await saveRunLog(run);

  logger.info(
    {
      agent: agentName,
      runId,
      status: run.status,
      duration: durationSeconds,
      tokens: run.tokens
    },
    'Agent run finished'
  );

  return run;
}
