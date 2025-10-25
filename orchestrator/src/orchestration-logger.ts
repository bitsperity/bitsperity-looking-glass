import { OrchestrationDB, CostRecord } from './db/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface TokenUsage {
  input: number;
  output: number;
}

interface ChatEntry {
  timestamp: string;
  run_id: string;
  agent: string;
  turn: number;
  turn_name?: string;
  type: 'turn_start' | 'message' | 'tool_call' | 'tool_result' | 'error';
  role?: string;
  content?: string;
  tokens?: TokenUsage;
  tool?: string;
  args?: any;
  result?: any;
  error?: string;
  metadata?: any;
}

export class OrchestrationLogger {
  private db: OrchestrationDB;
  private currentRunId?: string;
  private currentTurnId?: number;

  constructor(dbPath: string, _chatDir: string) {
    // chatDir parameter kept for backward compatibility but not used
    this.db = new OrchestrationDB(dbPath);
  }

  async logRunStart(agent: string, runId: string): Promise<void> {
    this.currentRunId = runId;

    this.db.insertRun({
      id: runId,
      agent,
      status: 'running',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      turns_completed: 0,
      turns_total: 0
    });

    logger.debug({ agent, runId }, 'Run started, logging initialized');
  }

  async logTurnStart(runId: string, turnNumber: number, turnName: string): Promise<void> {
    if (!this.currentRunId) this.currentRunId = runId;
    
    // Get agent from run
    const runs = this.db.getAgentRuns('', 1); // Will be fixed by run query
    // For now, extract agent from first message we can
    this.currentTurnId = this.db.insertTurn(runId, '', turnNumber, turnName);
    
    logger.debug({ runId, turnNumber, turnName }, 'Turn started');
  }

  async logMessage(runId: string, turnId: number | string, role: string, content: string, tokens?: TokenUsage): Promise<void> {
    if (!this.currentRunId || !this.currentTurnId) return;

    const actualTurnId = typeof turnId === 'string' ? this.currentTurnId : turnId;
    
    this.db.insertMessage(
      actualTurnId,
      runId,
      role,
      content,
      tokens?.input,
      tokens?.output
    );

    logger.debug({ runId, turnId: actualTurnId, role, length: content.length }, 'Message logged');
  }

  async logToolCall(runId: string, turnId: number | string, toolName: string, args: any): Promise<void> {
    if (!this.currentRunId || !this.currentTurnId) return;

    const actualTurnId = typeof turnId === 'string' ? this.currentTurnId : turnId;
    
    logger.debug({ toolName, argsType: typeof args, argsValue: args ? JSON.stringify(args).substring(0, 300) : 'undefined' }, 'logToolCall received args');
    
    this.db.insertToolCall(
      actualTurnId,
      runId,
      toolName,
      JSON.stringify({ type: 'tool_call' }),
      JSON.stringify(args)
    );

    logger.debug({ runId, turnId: actualTurnId, toolName }, 'Tool call logged');
  }

  async logToolResult(runId: string, turnId: number | string, toolName: string, result: any): Promise<void> {
    if (!this.currentRunId || !this.currentTurnId) return;

    const actualTurnId = typeof turnId === 'string' ? this.currentTurnId : turnId;
    
    // Get the last tool call for this turn
    const toolCalls = this.db.db.prepare(`
      SELECT id FROM tool_calls 
      WHERE turn_id = ? AND tool_name = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(actualTurnId, toolName) as any;

    if (toolCalls) {
      this.db.insertToolResult(
        toolCalls.id,
        actualTurnId,
        runId,
        JSON.stringify(result),
        undefined
      );
    }

    logger.debug({ runId, turnId: actualTurnId, toolName }, 'Tool result logged');
  }

  async logRunEnd(runId: string, agent: string, status: string, tokens?: TokenUsage, cost?: number, durationSeconds?: number): Promise<void> {
    const stmt = this.db.db.prepare(`
      UPDATE runs 
      SET status = ?, finished_at = ?, duration_seconds = ?,
          input_tokens = ?, output_tokens = ?, total_tokens = ?,
          cost_usd = ?
      WHERE id = ?
    `);

    stmt.run(
      status,
      new Date().toISOString(),
      durationSeconds,
      tokens?.input || 0,
      tokens?.output || 0,
      (tokens?.input || 0) + (tokens?.output || 0),
      cost || 0,
      runId
    );

    if (this.currentTurnId) {
      this.db.insertTurnCost(
        this.currentTurnId,
        runId,
        agent,
        undefined,
        tokens?.input,
        tokens?.output,
        cost
      );
    }

    logger.debug({ runId, status, duration: durationSeconds, cost }, 'Run finished, cost logged');
  }

  async close(): Promise<void> {
    logger.info('Database closed');
  }
}
