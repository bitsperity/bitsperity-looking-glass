import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';
import { TokenBudgetManager } from './token-budget.js';
import type { AgentConfig, TurnConfig } from './types.js';
import { getModelId } from './model-mapper.js';
import { OrchestrationDB } from './db/database.js';
import { ToolExecutor, type MCPConfig } from './tool-executor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Convert cost to USD based on model pricing
function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Model pricing in USD per 1M tokens
  // Handle both short names (haiku-3.5) and full IDs (claude-3-5-haiku-20241022)
  
  if (model.includes('haiku') || model.includes('3-5-haiku') || model.includes('3.5-haiku')) {
    // Haiku 3.5: $0.80 per 1M input, $2.40 per 1M output
    return (inputTokens * 0.80 + outputTokens * 2.40) / 1_000_000;
  }
  
  if (model.includes('haiku-4') || model.includes('3-5-haiku-4')) {
    // Haiku 4.5: Same pricing as 3.5
    return (inputTokens * 0.80 + outputTokens * 2.40) / 1_000_000;
  }
  
  if (model.includes('sonnet') && (model.includes('4.5') || model.includes('4-5'))) {
    // Sonnet 4.5: $3.00 per 1M input, $15.00 per 1M output
    return (inputTokens * 3.00 + outputTokens * 15.00) / 1_000_000;
  }
  
  if (model.includes('opus') && (model.includes('4.1') || model.includes('4-1'))) {
    // Opus 4.1: $15.00 per 1M input, $75.00 per 1M output
    return (inputTokens * 15.00 + outputTokens * 75.00) / 1_000_000;
  }
  
  // Default: Haiku pricing as fallback
  logger.warn({ model }, 'Unknown model for cost calculation, using Haiku pricing as fallback');
  return (inputTokens * 0.80 + outputTokens * 2.40) / 1_000_000;
}

// Load rules for a turn from database
function loadTurnRulesFromDB(ruleIds: string[], db: OrchestrationDB): string {
  const rules: string[] = [];
  
  // Use per-turn rules if specified
  if (!ruleIds || ruleIds.length === 0) {
    return '';
  }
  
  // Load content for each rule ID from database
  for (const ruleId of ruleIds) {
    try {
      const rule = db.getRule(ruleId);
      if (rule && rule.content) {
        rules.push(rule.content);
      } else {
        logger.warn({ ruleId }, 'Rule not found in database');
      }
    } catch (error) {
      logger.warn({ ruleId, error }, 'Failed to load rule from database');
    }
  }

  // Concatenate all rules with separators
  return rules.length > 0 
    ? rules.map((rule, idx) => `[Rule ${idx + 1}]\n${rule}`).join('\n\n')
    : '';
}

// Process a single agentic turn with Claude and Tool Calling
async function processTurn(
  client: Anthropic,
  runId: string,
  turnId: number,
  turnNumber: number,
  turn: TurnConfig,
  config: AgentConfig,
  toolExecutor: ToolExecutor,
  db: OrchestrationDB,
  model: string,
  maxSteps: number,
  turnRules: string = '',
  previousMessages: Anthropic.MessageParam[] = []  // Context from previous turns
): Promise<{ inputTokens: number; outputTokens: number; responseText: string; toolCalls: number; finalMessages: Anthropic.MessageParam[] }> {
  // Start with context from previous turns (deep copy to avoid mutations)
  const messages: Anthropic.MessageParam[] = JSON.parse(JSON.stringify(previousMessages));
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalToolCalls = 0;
  let responseText = '';

  logger.info(
    { turnNumber, maxSteps, toolCount: toolExecutor.getToolCount() },
    'Starting agentic loop with Tool Calling'
  );

  // Get tools filtered by turn.tools (preferred) or turn.mcps (fallback)
  const turnTools = (turn as any).tools || [];
  const turnMcps = turn.mcps || [];
  
  let claudeTools: Anthropic.Tool[];
  if (turnTools.length > 0) {
    // Use specific tool selection (new way)
    claudeTools = toolExecutor.getClaudeToolsForTools(turnTools);
    logger.info(
      { turnNumber, tools: turnTools, toolCount: claudeTools.length },
      'Tools filtered by specific tool selection'
    );
  } else if (turnMcps.length > 0) {
    // Fallback to MCP selection (old way, for compatibility)
    claudeTools = toolExecutor.getClaudeToolsForMcps(turnMcps);
    logger.info(
      { turnNumber, mcps: turnMcps, toolCount: claudeTools.length },
      'Tools filtered by MCP selection'
    );
  } else {
    // Fallback: alle Tools wenn nichts angegeben
    claudeTools = toolExecutor.getClaudeTools();
    logger.info(
      { turnNumber, toolCount: claudeTools.length },
      'No tool filter specified, using all tools'
    );
  }

  // Agentic loop: keep calling Claude until stop
  for (let step = 0; step < maxSteps; step++) {
    logger.info({ turnNumber, step: step + 1, maxSteps }, 'Processing step');

    try {
      // Add user message on first step
      if (step === 0) {
        // Add current date/time information at the start of the first turn
        if (turnNumber === 1 && previousMessages.length === 0) {
          const now = new Date();
          const dateTime = now.toISOString();
          const dateTimeReadable = now.toLocaleString('de-DE', { 
            timeZone: 'Europe/Berlin',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          });
          
          messages.push({
            role: 'user',
            content: `Aktuelles Datum und Uhrzeit: ${dateTimeReadable} (ISO: ${dateTime})\n\nBeginn der Agent-Ausführung.`
          });
        }
        
        messages.push({
          role: 'user',
          content: turn.prompt || 'Process the available data'
        });

        logger.info(
          { turnNumber, step: step + 1, prompt: turn.prompt?.slice(0, 100) },
          'User prompt added'
        );
      }

      // Build request with integrated rules into system prompt
      // OPTIMIZATION: Only send system prompt once at the very beginning of the agent run
      // (first step of first turn) to save tokens. The conversation history in messages
      // maintains context, so we don't need to repeat the system prompt.
      let systemPrompt: string | undefined = undefined;
      if (step === 0 && turnNumber === 1 && previousMessages.length === 0) {
        // Only send system prompt at the very start of the agent run
        systemPrompt = (config as any).system_prompt || '';
      if (turnRules) {
        systemPrompt = systemPrompt + '\n\n---\n\n' + turnRules;
        }
      }
      
      const requestParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model: model,
        max_tokens: turn.max_tokens || (config as any).max_tokens_per_turn || 4000,
        messages: messages as Anthropic.MessageParam[],
        tools: claudeTools
      };
      
      // Only include system parameter if we have a system prompt (first step only)
      if (systemPrompt) {
        requestParams.system = systemPrompt;
      }

      // Call Claude with tool definitions
      const response = await client.messages.create(requestParams);

      // Track tokens
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      logger.info(
        {
          turnNumber,
          step: step + 1,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          stopReason: response.stop_reason
        },
        'Claude response received'
      );

      // Collect all content from response
      let hasToolUse = false;
      const assistantContent: any[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          responseText += block.text;
          assistantContent.push(block);

          logger.info(
            { turnNumber, step: step + 1, textLength: block.text.length },
            'Text response'
          );
        } else if (block.type === 'tool_use') {
          // Tool use detected
          hasToolUse = true;
          totalToolCalls++;
          assistantContent.push(block);

          logger.info(
            {
              turnNumber,
              step: step + 1,
              toolName: block.name,
              toolId: block.id,
              inputKeys: Object.keys(block.input || {})
            },
            'Tool use detected'
          );

          // Log tool call START (before execution)
          db.insertToolCallStart(
            runId,
            turnId,
            block.id,
            block.name,
            JSON.stringify(block.input || {})
          );
        }
      }

      // Add assistant response to messages
      messages.push({
        role: 'assistant',
        content: assistantContent
      });

      // If no tool use or stop reason is 'end_turn', we're done
      if (!hasToolUse || response.stop_reason === 'end_turn') {
        logger.info(
          { turnNumber, step: step + 1, reason: response.stop_reason },
          'Turn completed - no more tool use'
        );
        break;
      }

      // Execute tool calls and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          try {
            const toolStartTime = Date.now();

            logger.info(
              { turnNumber, step: step + 1, toolName: block.name },
              'Executing tool'
            );

            // Execute the tool via ToolExecutor
            const result = await toolExecutor.executeTool(block.name, block.input as Record<string, any>);

            const duration = Date.now() - toolStartTime;

            logger.info(
              {
                turnNumber,
                step: step + 1,
                toolName: block.name,
                durationMs: duration,
                resultType: typeof result
              },
              'Tool executed successfully'
            );

            // Update tool call with RESULT (after execution)
            db.updateToolCallComplete(
              block.id,
              JSON.stringify(result),
              duration,
              'success'
            );

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result)
            });
          } catch (error: any) {
            const duration = 0;
            const errorMsg = error?.message || String(error);
            const errorStack = error?.stack || '';

            logger.error(
              { 
                turnNumber, 
                step: step + 1, 
                toolName: block.name,
                toolId: block.id,
                args: block.input,
                error: errorMsg,
                stack: errorStack
              },
              'Tool execution failed'
            );

            // Update tool call with ERROR (after execution)
            db.updateToolCallComplete(
              block.id,
              JSON.stringify({ error: errorMsg, stack: errorStack }),
              duration,
              'error',
              errorMsg
            );

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Error: ${errorMsg}`,
              is_error: true
            });
          }
        }
      }

      // Add tool results to messages
      if (toolResults.length > 0) {
        messages.push({
          role: 'user',
          content: toolResults
        });

        logger.info(
          { turnNumber, step: step + 1, resultCount: toolResults.length },
          'Tool results added to context'
        );
      }

    } catch (error: any) {
      logger.error(
        { turnNumber, step: step + 1, error: error?.message },
        'Step failed'
      );
      throw error;
    }
  }

  return {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    responseText,
    toolCalls: totalToolCalls,
    finalMessages: messages  // Return messages for next turn
  };
}

export async function runAgent(
  config: AgentConfig,
  toolExecutor: ToolExecutor,
  db: OrchestrationDB,
  tokenBudget?: TokenBudgetManager
): Promise<{ runId: string; status: string; totalTokens: number; cost: number }> {
  
  const runId = randomUUID();
  const configWithAgent = { ...config };

  // Initialize variables OUTSIDE try/catch so they're accessible in both blocks
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalToolCalls = 0;
  let turnsCompleted = 0;
  const startTime = Date.now();

  try {
    // Initialize run
    db.insertRun({
      id: runId,
      agent: configWithAgent.agent || 'unknown',
      status: 'running',
      created_at: new Date().toISOString(),
      turns_total: config.turns.length,
      turns_completed: 0,
      model_used: config.model  // Set model immediately on start
    });

    logger.info({ runId, agent: configWithAgent.agent }, 'Starting agent run');

    // Initialize Anthropic client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Initialize shared message context that persists across all turns
    // This allows the agent to remember what happened in previous turns
    let sharedMessages: Anthropic.MessageParam[] = [];

    // Run turns sequentially
    for (let turnIdx = 0; turnIdx < config.turns.length; turnIdx++) {
      const turnNumber = turnIdx + 1;
      const turn = config.turns[turnIdx];

      logger.info({ runId, turnNumber, turnName: turn.name }, 'Starting turn');

      // Get model first so we can store it with the turn
      const model = await getModelId(turn.model || config.model);
      const maxSteps = turn.max_steps || (configWithAgent.max_steps || 5);

      // Initialize turn with model - returns turn_id for logging
      const turnId = db.insertTurnDetails(runId, turnNumber, turn.name, 'pending', undefined, model);

      let turnInputTokens = 0;
      let turnOutputTokens = 0;
      let turnResponse = '';
      let turnToolCalls = 0;

      try {
        // Log system prompt for this turn (collapsed by default)
        db.insertMessage(turnId, runId, 'system', configWithAgent.system_prompt || 'No system prompt defined', 0, 0, 'system');
        
        // Load and log rules for this turn (supports multiple rules per turn)
        const turnRules = loadTurnRulesFromDB(turn.rules || configWithAgent.rules || [], db);
        if (turnRules) {
          db.insertMessage(turnId, runId, 'system', turnRules, 0, 0, 'rules');
        }

        // Add date/time information at the start of the first turn
        if (turnIdx === 0) {
          const now = new Date();
          const dateTime = now.toISOString();
          const dateTimeReadable = now.toLocaleString('de-DE', { 
            timeZone: 'Europe/Berlin',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          });
          
          db.insertMessage(
            turnId, 
            runId, 
            'system', 
            `Aktuelles Datum und Uhrzeit: ${dateTimeReadable} (ISO: ${dateTime})`, 
            0, 
            0, 
            'datetime'
          );
        }

        // Log user prompt BEFORE processing (turn prompt)
        db.insertMessage(turnId, runId, 'user', turn.prompt || '', 0, 0, 'user');

        // Log context continuity info (full message history is passed to processTurn)
        if (turnIdx > 0 && sharedMessages.length > 0) {
          logger.info(
            { turnNumber, previousMessagesCount: sharedMessages.length },
            'Including context from previous turns'
          );
        }

        // Process turn with agentic loop and tool calling
        // Pass sharedMessages to maintain context across turns
        const result = await processTurn(
          client,
          runId,
          turnId,
          turnNumber,
          turn,
          config,
          toolExecutor,
          db,
          model,
          maxSteps,
          turnRules,  // Pass rules to be integrated into system prompt
          sharedMessages  // Pass previous turn's context
        );

        turnInputTokens = result.inputTokens;
        turnOutputTokens = result.outputTokens;
        turnResponse = result.responseText;
        turnToolCalls = result.toolCalls;
        
        // Update shared messages with this turn's context for next turn
        // This preserves the full conversation history across turns
        sharedMessages = result.finalMessages;
        
        logger.info(
          { turnNumber, messagesCount: sharedMessages.length },
          'Context updated for next turn'
        );
        
        // Log final response
        db.insertMessage(turnId, runId, 'assistant', turnResponse, turnOutputTokens, turnInputTokens, 'assistant');

        const turnCost = calculateCost(turnInputTokens, turnOutputTokens, model);

        // Complete turn with all details
        db.completeTurnDetails(
          runId,
          turnNumber,
          turnInputTokens,
          turnOutputTokens,
          turnCost,
          turnToolCalls,
          'success'
        );

        totalInputTokens += turnInputTokens;
        totalOutputTokens += turnOutputTokens;
        totalToolCalls += turnToolCalls;
        turnsCompleted++;

        logger.info(
          { turnNumber, turnInputTokens, turnOutputTokens, turnCost, status: 'completed' },
          'Turn completed successfully'
        );

        // Add delay between turns to respect rate limits (50K tokens/min)
        // 70 second delay ensures we stay under the limit with buffer time
        if (turnIdx < config.turns.length - 1) {
          logger.info(
            { delay: '70 seconds', reason: 'Anthropic rate limit: 50K tokens/minute' },
            'Waiting before next turn'
          );
          await new Promise(resolve => setTimeout(resolve, 70000));
        }

        // Update run progress in real-time (tokens/costs) so running runs show live data
        db.updateRunProgress(
          runId,
          totalInputTokens,
          totalOutputTokens,
          calculateCost(totalInputTokens, totalOutputTokens, config.model),
          turnsCompleted
        );

      } catch (turnError: any) {
        const errorMsg = turnError?.message || String(turnError);
        const errorStack = turnError?.stack || '';
        const errorStatus = turnError?.status || null;
        const errorCode = turnError?.error?.error?.type || null;

        logger.error(
          { 
            turnNumber,
            turnName: turn.name,
            error: errorMsg,
            status: errorStatus,
            errorCode,
            stack: errorStack
          },
          'Turn failed'
        );

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

        // Immediately mark the entire run as failed to prevent stuck "running" status
        db.completeRun(
          runId,
          totalInputTokens + turnInputTokens,
          totalOutputTokens + turnOutputTokens,
          calculateCost(totalInputTokens + turnInputTokens, totalOutputTokens + turnOutputTokens, model),
          turnsCompleted,
          'error',
          errorMsg,
          Math.round((Date.now() - startTime) / 1000),
          config.model
        );

        throw turnError;
      }
    }

    // Calculate total cost
    const totalCost = calculateCost(totalInputTokens, totalOutputTokens, config.model);
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Complete run with all final statistics
    db.completeRun(
      runId,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      config.turns.length,
      'success',
      undefined,
      duration,
      config.model
    );

    logger.info(
      {
        runId,
        agent: config.agent || configWithAgent.agent,
        model: config.model,
        duration,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        cost: totalCost,
        toolCalls: totalToolCalls,
        status: 'success'
      },
      'Agent run completed successfully'
    );

    return {
      runId,
      status: 'success',
      totalTokens: totalInputTokens + totalOutputTokens,
      cost: totalCost
    };

  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const errorStack = error?.stack || '';
    const errorStatus = error?.status || null;
    const errorCode = error?.error?.error?.type || null;

    logger.error(
      {
        runId,
        agent: configWithAgent.agent || 'unknown',
        error: errorMsg,
        status: errorStatus,
        errorCode,
        stack: errorStack,
        tokens: { input: totalInputTokens, output: totalOutputTokens },
        turnsCompleted
      },
      'Agent run failed'
    );

    // Mark run as failed but keep the tokens/costs recorded so far
    db.completeRun(
      runId,
      totalInputTokens,
      totalOutputTokens,
      calculateCost(totalInputTokens, totalOutputTokens, config.model),
      turnsCompleted,
      'error',
      errorMsg,
      undefined,
      config.model
    );

    return {
      runId,
      status: 'error',
      totalTokens: totalInputTokens + totalOutputTokens,
      cost: calculateCost(totalInputTokens, totalOutputTokens, config.model)
    };
  }
}
