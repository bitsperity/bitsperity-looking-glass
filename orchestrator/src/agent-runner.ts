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
import { MCPHandler } from './mcp-handler.js';
import { getModelId, getModelProvider } from './model-mapper.js';
import { OrchestrationLogger } from './orchestration-logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Model selector with automatic mapping
async function selectModel(modelName: string) {
  // Map simple name to actual API ID (e.g., "haiku-3.5" -> "claude-3-5-haiku-20241022")
  const actualModelId = await getModelId(modelName);
  const provider = await getModelProvider(modelName);

  logger.debug(
    { simpleName: modelName, actualId: actualModelId, provider },
    'Model selected'
  );

  if (provider === 'anthropic') {
    return anthropic(actualModelId);
  } else if (provider === 'openai') {
    return openai(actualModelId);
  } else {
    logger.warn({ model: modelName }, 'Unknown provider, defaulting to Anthropic');
    return anthropic(actualModelId);
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

export async function runAgent(
  agentName: string,
  config: AgentConfig,
  mcpPool: MCPPool,
  budget: TokenBudgetManager
): Promise<AgentRun> {
  const startTime = Date.now();
  const runId = `${agentName}__${new Date().toISOString().replace(/[:.]/g, '-')}__${randomUUID().substring(0, 8)}`;

  // Initialize new logging system
  const dbPath = path.join(__dirname, '..', 'logs', 'orchestration.db');
  const chatDir = path.join(__dirname, '..', 'logs', 'chats');
  const orchestrationLogger = new OrchestrationLogger(dbPath, chatDir);

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
    for (const [turnIndex, turn] of config.turns.entries()) {
      const turnNumber = turnIndex + 1;
      logger.info({ agent: agentName, turn: turn.id, name: turn.name }, 'Starting turn');

      await orchestrationLogger.logTurnStart(runId, turnNumber, turn.name);

      // Build turn prompt
      const turnPrompt = await buildTurnPrompt(turn, rulesContent, chatHistory, agentName);

      // Select model
      const modelName = turn.model || config.model;
      const model = await selectModel(modelName);

      // Check budget
      if (!budget.canSpend(agentName, turn.max_tokens)) {
        logger.warn({ agent: agentName, turn: turn.id }, 'Budget exhausted, stopping');
        break;
      }

      // Get tools for this turn
      let tools: Record<string, any> = {};
      if (turn.mcps && turn.mcps.length > 0) {
        try {
          // Get tools for all MCPs needed by this turn
          tools = await mcpPool.getTools(turn.mcps);
          logger.debug({ agent: agentName, turn: turn.id, mcps: turn.mcps, toolCount: Object.keys(tools).length }, 'MCP tools loaded');
          
          // Log first tool schema for debug
          const firstToolName = Object.keys(tools)[0];
          if (firstToolName) {
            const firstTool = tools[firstToolName];
            console.log(`[AGENT] First tool schema: ${firstToolName}`, {
              hasDescription: !!firstTool.description,
              hasInputSchema: !!firstTool.inputSchema,
              hasExecute: typeof firstTool.execute,
              schemaType: firstTool.inputSchema?.type,
              schemaPropsCount: Object.keys(firstTool.inputSchema?.properties || {}).length
            });
          }
        } catch (error) {
          logger.error({ agent: agentName, turn: turn.id, error }, 'Failed to load MCP tools');
        }
      }

      logger.debug(
        { agent: agentName, turn: turn.id, toolCount: Object.keys(tools).length },
        'Tools loaded via Schema Definition Mode'
      );

      // LLM call
      let result;
      try {
        // DEBUG: Check tools before sending to LLM
        if (Object.keys(tools).length > 0) {
          const firstToolName = Object.keys(tools)[0];
          const firstTool = tools[firstToolName];
          logger.info({
            agent: agentName,
            turn: turn.id,
            firstToolName,
            firstToolKeys: Object.keys(firstTool),
            hasParameters: 'parameters' in firstTool,
            parametersType: firstTool.parameters?.type,
            parametersKeys: Object.keys(firstTool.parameters || {})
          }, 'TOOLS_BEFORE_LLM_CALL');
        }
        
        logger.info(
          {
            agent: agentName,
            turn: turn.id,
            modelName,
            toolCount: Object.keys(tools).length,
            promptLength: turnPrompt.length
          },
          'About to call LLM'
        );
        
        result = await generateText({
          model,
          maxTokens: turn.max_tokens,
          prompt: turnPrompt,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          temperature: 0.7,
          maxSteps: 3,
          experimental_repairToolCall: async ({ toolCall, tools, inputSchema, error }) => {
            // Only attempt to repair invalid inputs
            if (!error || (error as any).type !== 'invalid-tool-input') return null;

            const toolName = toolCall.toolName;
            const toolDef = (tools as any)[toolName];

            try {
              // Simple heuristics for common MCP tools
              const input: any = typeof toolCall.input === 'string' ? JSON.parse(toolCall.input) : toolCall.input || {};

              if (toolName.includes('manifold_mf_create_thought')) {
                // Ensure required 'type' exists
                if (!input.type) input.type = 'signal';
                if (!input.title) input.title = 'Auto-generated signal';
                if (!input.content) input.content = 'Auto-repaired tool call.';

                return { ...toolCall, input: JSON.stringify(input) };
              }

              if (toolName.includes('satbase_get_watchlist')) {
                // No args needed
                return { ...toolCall, input: JSON.stringify({}) };
              }

              // Default: return original
              return null;
            } catch {
              return null;
            }
          }
        });
        
        logger.info(
          {
            agent: agentName,
            turn: turn.id,
            hasUsage: !!result.usage,
            inputTokens: result.usage?.inputTokens,
            outputTokens: result.usage?.outputTokens,
            textLength: result.text.length
          },
          'LLM call succeeded'
        );
      } catch (error) {
        const errorInfo: any = {
          agent: agentName,
          turn: turn.id,
          modelName,
          toolCount: Object.keys(tools).length,
          provider: modelName.startsWith('claude-') ? 'anthropic' : 'openai'
        };
        
        if (error instanceof Error) {
          errorInfo.errorName = error.name;
          errorInfo.errorMessage = error.message;
          errorInfo.errorStack = error.stack?.split('\n').slice(0, 5);
        } else if (error && typeof error === 'object') {
          errorInfo.errorObject = JSON.stringify(error, null, 2).substring(0, 500);
        } else {
          errorInfo.errorValue = String(error).substring(0, 200);
        }
        
        logger.error(errorInfo, 'LLM call FAILED - CRITICAL ERROR');
        
        // Also log to database for persistence
        await orchestrationLogger.logMessage(runId, turnNumber, 'system', `ERROR: LLM call failed: ${errorInfo.errorMessage}`);
        
        throw error;
      }

      totalInputTokens += result.usage?.inputTokens ?? 0;
      totalOutputTokens += result.usage?.outputTokens ?? 0;

      // Log user message and assistant response
      await orchestrationLogger.logMessage(runId, turnNumber, 'user', turnPrompt);
      await orchestrationLogger.logMessage(runId, turnNumber, 'assistant', result.text, {
        input: result.usage?.inputTokens ?? 0,
        output: result.usage?.outputTokens ?? 0
      });

      logger.info(
        {
          agent: agentName,
          turn: turn.id,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          totalInputSoFar: totalInputTokens,
          totalOutputSoFar: totalOutputTokens,
          hasUsage: !!result.usage,
          responseLength: result.text.length,
          responsePreview: result.text.substring(0, 100)
        },
        'Turn completed with token counts'
      );

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

      // Handle tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          try {
            // Log complete tool call to see all available data
            logger.info({ toolCall }, 'toolCall details from AI SDK result');
            
            // Always log the tool call first, regardless of execution
            await orchestrationLogger.logToolCall(runId, turnNumber, toolCall.toolName, toolCall.args);

            // If this tool has an execute handler (handled by AI SDK already), skip re-execution
            const hasExecute = tools && (tools as any)[toolCall.toolName] && typeof (tools as any)[toolCall.toolName].execute === 'function';
            if (hasExecute) {
              logger.debug({ tool: toolCall.toolName }, 'Skipping manual tool call (already executed by AI SDK)');
              continue;
            }

            logger.debug({ 
              agent: agentName, 
              tool: toolCall.toolName,
              argsType: typeof toolCall.args,
              argsValue: toolCall.args ? JSON.stringify(toolCall.args).substring(0, 200) : 'undefined'
            }, 'Calling tool');
            
            logger.debug({ 
              tool: toolCall.toolName,
              beforeCallArgsType: typeof toolCall.args
            }, 'About to call mcpPool.callTool');
            
            const toolResult = await mcpPool.callTool(toolCall.toolName, toolCall.args || {});

            await orchestrationLogger.logToolResult(runId, turnNumber, toolCall.toolName, toolResult);

            chatHistory.push({
              role: 'user',
              content: `Tool ${toolCall.toolName} result: ${JSON.stringify(toolResult).substring(0, 1000)}`
            });

            logger.debug({ agent: agentName, tool: toolCall.toolName }, 'Tool call succeeded');
          } catch (error) {
            logger.error({ 
              agent: agentName, 
              tool: toolCall.toolName, 
              errorMessage: error instanceof Error ? error.message : String(error),
              errorType: error instanceof Error ? error.constructor.name : typeof error,
              errorCode: (error as any)?.code,
              error 
            }, 'Tool call failed');
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

  const cost = await budget.calculateCost(totalInputTokens, totalOutputTokens, config.model);
  const durationSeconds = (Date.now() - startTime) / 1000;

  // Log run end
  const status = chatHistory.length > 0 ? 'completed' : 'failed';
  await orchestrationLogger.logRunEnd(runId, agentName, status, {
    input: totalInputTokens,
    output: totalOutputTokens
  }, cost, durationSeconds);

  // Compatibility: still return AgentRun for other code
  const run: AgentRun = {
    run_id: runId,
    agent: agentName,
    timestamp: new Date().toISOString(),
    status: status as any,
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

  await orchestrationLogger.close();

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
