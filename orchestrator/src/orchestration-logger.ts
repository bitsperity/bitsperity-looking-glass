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
  private chatDir: string;
  private currentRunId?: string;
  private currentChatPath?: string;

  constructor(dbPath: string, chatDir: string) {
    this.db = new OrchestrationDB(dbPath);
    this.chatDir = chatDir;
  }

  async logRunStart(agent: string, runId: string): Promise<void> {
    this.currentRunId = runId;

    const date = new Date().toISOString().split('T')[0];
    this.currentChatPath = path.join(this.chatDir, date, `${runId}.jsonl`);

    await fs.mkdir(path.dirname(this.currentChatPath), { recursive: true });

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
      turns_total: 0,
      chat_file: this.currentChatPath
    });

    logger.debug({ agent, runId }, 'Run started, logging initialized');
  }

  async logTurnStart(runId: string, turnNumber: number, turnName: string): Promise<void> {
    const entry: ChatEntry = {
      timestamp: new Date().toISOString(),
      run_id: runId,
      agent: '',
      turn: turnNumber,
      turn_name: turnName,
      type: 'turn_start'
    };

    await this.appendChatEntry(entry);
  }

  async logMessage(
    runId: string,
    turn: number,
    role: string,
    content: string,
    tokens?: TokenUsage
  ): Promise<void> {
    const entry: ChatEntry = {
      timestamp: new Date().toISOString(),
      run_id: runId,
      agent: '',
      turn,
      type: 'message',
      role,
      content,
      tokens
    };

    await this.appendChatEntry(entry);
  }

  async logToolCall(
    runId: string,
    turn: number,
    toolName: string,
    args: any
  ): Promise<void> {
    const entry: ChatEntry = {
      timestamp: new Date().toISOString(),
      run_id: runId,
      agent: '',
      turn,
      type: 'tool_call',
      tool: toolName,
      args
    };

    await this.appendChatEntry(entry);
  }

  async logToolResult(
    runId: string,
    turn: number,
    toolName: string,
    result: any
  ): Promise<void> {
    const entry: ChatEntry = {
      timestamp: new Date().toISOString(),
      run_id: runId,
      agent: '',
      turn,
      type: 'tool_result',
      tool: toolName,
      result
    };

    await this.appendChatEntry(entry);
  }

  async logRunEnd(
    runId: string,
    agent: string,
    status: string,
    tokens: TokenUsage,
    cost: number,
    duration: number,
    errorMessage?: string
  ): Promise<void> {
    this.db.updateRun(runId, {
      status,
      finished_at: new Date().toISOString(),
      duration_seconds: duration,
      input_tokens: tokens.input,
      output_tokens: tokens.output,
      total_tokens: tokens.input + tokens.output,
      cost_usd: cost,
      error_message: errorMessage
    });

    const date = new Date().toISOString().split('T')[0];
    const costRecord: CostRecord = {
      id: `${runId}_cost`,
      agent,
      run_id: runId,
      timestamp: new Date().toISOString(),
      input_tokens: tokens.input,
      output_tokens: tokens.output,
      total_tokens: tokens.input + tokens.output,
      cost_usd: cost,
      daily_date: date
    };

    this.db.insertCost(costRecord);

    logger.debug({ agent, runId, tokens, cost }, 'Run finished, cost logged');
  }

  private async appendChatEntry(entry: ChatEntry): Promise<void> {
    if (!this.currentChatPath) {
      logger.warn('Chat path not initialized');
      return;
    }

    try {
      await fs.appendFile(
        this.currentChatPath,
        JSON.stringify(entry) + '\n'
      );
    } catch (error) {
      logger.error({ error, path: this.currentChatPath }, 'Failed to append chat entry');
    }
  }

  close(): void {
    this.db.close();
  }
}
