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
  // Haiku 3.5 pricing: $0.80 per 1M input, $2.40 per 1M output
  if (model.includes('haiku-3.5')) {
    return (inputTokens * 0.00080 + outputTokens * 0.0024) / 1000;
  }
  // Haiku 4.5 pricing
  if (model.includes('haiku-4.5')) {
    return (inputTokens * 0.00080 + outputTokens * 0.0024) / 1000;
  }
  // Sonnet 4.5 pricing: $3.00 per 1M input, $15.00 per 1M output
  if (model.includes('sonnet-4.5')) {
    return (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
  }
  // Opus 4.1 pricing: $15.00 per 1M input, $75.00 per 1M output
  if (model.includes('opus-4.1')) {
    return (inputTokens * 0.015 + outputTokens * 0.075) / 1000;
  }
  return 0;
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
  maxSteps: number
): Promise<{ inputTokens: number; outputTokens: number; responseText: string; toolCalls: number }> {
  const messages: Anthropic.MessageParam[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalToolCalls = 0;
  let responseText = '';

  logger.info(
    { turnNumber, maxSteps, toolCount: toolExecutor.getToolCount() },
    'Starting agentic loop with Tool Calling'
  );

  // Get all tools as Claude tool definitions
  const claudeTools = toolExecutor.getClaudeTools();

  // Agentic loop: keep calling Claude until stop
  for (let step = 0; step < maxSteps; step++) {
    logger.info({ turnNumber, step: step + 1, maxSteps }, 'Processing step');

    try {
      // Add user message on first step
      if (step === 0) {
        messages.push({
          role: 'user',
          content: turn.prompt || 'Process the available data'
        });

        logger.info(
          { turnNumber, step: step + 1, prompt: turn.prompt?.slice(0, 100) },
          'User prompt added'
        );
      }

      // Build request
      const requestParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model: model,
        max_tokens: turn.max_tokens || (config as any).max_tokens_per_turn || 4000,
        system: (config as any).system_prompt || '',
        messages: messages as Anthropic.MessageParam[],
        tools: claudeTools
      };

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
    toolCalls: totalToolCalls
  };
}

export async function runAgent(
  config: AgentConfig,
  toolExecutor: ToolExecutor,
  db: OrchestrationDB,
  tokenBudget?: TokenBudgetManager
): Promise<{ runId: string; status: string; totalTokens: number; cost: number }> {
  const runId = randomUUID();
  const startTime = Date.now();
  const configWithAgent = config as any;

  // Initialize Anthropic client
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  try {
    // Initialize run
    db.insertRun({
      id: runId,
      agent: configWithAgent.agent || 'unknown',
      status: 'running',
      created_at: new Date().toISOString(),
      turns_total: config.turns.length,
      turns_completed: 0
    });

    logger.info({ runId, agent: configWithAgent.agent }, 'Starting agent run');

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalToolCalls = 0;
    let turnsCompleted = 0;

    // Run turns sequentially
    for (let turnIdx = 0; turnIdx < config.turns.length; turnIdx++) {
      const turnNumber = turnIdx + 1;
      const turn = config.turns[turnIdx];

      logger.info({ runId, turnNumber, turnName: turn.name }, 'Starting turn');

      // Initialize turn - returns turn_id for logging
      const turnId = db.insertTurnDetails(runId, turnNumber, turn.name, 'pending');

      const model = await getModelId(turn.model || config.model);
      const maxSteps = turn.max_steps || (configWithAgent.max_steps || 5);

      let turnInputTokens = 0;
      let turnOutputTokens = 0;
      let turnResponse = '';
      let turnToolCalls = 0;

      try {
        // Process turn with agentic loop and tool calling
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
          maxSteps
        );

        turnInputTokens = result.inputTokens;
        turnOutputTokens = result.outputTokens;
        turnResponse = result.responseText;
        turnToolCalls = result.toolCalls;

        // Log final response
        db.insertMessage(turnId, runId, 'assistant', turnResponse);

        const turnCost = calculateCost(turnInputTokens, turnOutputTokens, model);
        totalInputTokens += turnInputTokens;
        totalOutputTokens += turnOutputTokens;
        totalToolCalls += turnToolCalls;
        turnsCompleted++;

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
            inputTokens: turnInputTokens,
            outputTokens: turnOutputTokens,
            cost: turnCost,
            toolCalls: turnToolCalls
          },
          'Turn completed successfully'
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
      'success'
    );

    logger.info(
      {
        runId,
        agent: config.agent || configWithAgent.name,
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
      errorMsg
    );

    return {
      runId,
      status: 'error',
      totalTokens: totalInputTokens + totalOutputTokens,
      cost: calculateCost(totalInputTokens, totalOutputTokens, config.model)
    };
  }
}
