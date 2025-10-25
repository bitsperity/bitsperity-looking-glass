import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface RunRecord {
  id: string;
  agent: string;
  status: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  model_used?: string;
  turns_completed: number;
  turns_total: number;
  error_message?: string;
  chat_file?: string;
}

export interface CostRecord {
  id: string;
  agent: string;
  run_id?: string;
  timestamp: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  daily_date: string;
}

export interface AgentStats {
  name: string;
  enabled: boolean;
  model?: string;
  schedule?: string;
  total_runs: number;
  total_tokens: number;
  total_cost_usd: number;
  last_run_id?: string;
  last_run_at?: string;
}

export interface RunFilters {
  agent?: string;
  days?: number;
  status?: string;
}

export interface DailyCostBreakdown {
  date: string;
  total_cost: number;
  by_agent: Array<{
    agent: string;
    model?: string;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  }>;
}

export class OrchestrationDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.initSchema();
    logger.info({ dbPath }, 'Database initialized');
  }

  private initSchema(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  insertRun(run: Partial<RunRecord>): void {
    const stmt = this.db.prepare(`
      INSERT INTO runs (
        id, agent, status, created_at, started_at, finished_at, 
        duration_seconds, input_tokens, output_tokens, total_tokens, 
        cost_usd, model_used, turns_completed, turns_total, 
        error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      run.id,
      run.agent,
      run.status || 'pending',
      run.created_at,
      run.started_at,
      run.finished_at,
      run.duration_seconds,
      run.input_tokens || 0,
      run.output_tokens || 0,
      run.total_tokens || 0,
      run.cost_usd || 0,
      run.model_used,
      run.turns_completed || 0,
      run.turns_total || 0,
      run.error_message
    );
  }

  insertTurn(runId: string, agent: string, turnNumber: number, turnName: string, model?: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO turns (run_id, agent, turn_number, turn_name, model)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(runId, agent, turnNumber, turnName, model);
    return result.lastInsertRowid as number;
  }

  insertMessage(turnId: number, runId: string, role: string, content: string, tokensInput?: number, tokensOutput?: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO messages (turn_id, run_id, role, content, tokens_input, tokens_output)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(turnId, runId, role, content, tokensInput, tokensOutput);
    return result.lastInsertRowid as number;
  }

  insertToolCall(turnId: number, runId: string, toolName: string, inputSchema?: string, args?: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO tool_calls (turn_id, run_id, tool_name, input_schema, args)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(turnId, runId, toolName, inputSchema, args);
    return result.lastInsertRowid as number;
  }

  insertToolResult(toolCallId: number, turnId: number, runId: string, result?: string, error?: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO tool_results (tool_call_id, turn_id, run_id, result, error)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result_stmt = stmt.run(toolCallId, turnId, runId, result, error);
    return result_stmt.lastInsertRowid as number;
  }

  insertTurnCost(turnId: number, runId: string, agent: string, model?: string, inputTokens?: number, outputTokens?: number, costUsd?: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO turn_costs (turn_id, run_id, agent, model, input_tokens, output_tokens, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(turnId, runId, agent, model, inputTokens || 0, outputTokens || 0, costUsd || 0);
    return result.lastInsertRowid as number;
  }

  // Query methods for API
  getAgentRuns(agent: string, limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT id, agent, status, created_at, started_at, finished_at, 
             duration_seconds, input_tokens, output_tokens, total_tokens, 
             cost_usd, model_used, turns_completed, turns_total, error_message
      FROM runs 
      WHERE agent = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(agent, limit) as any[];
  }

  getChatForRun(runId: string): any {
    const run = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as any;
    if (!run) return null;

    const turns = this.db.prepare(`
      SELECT id, run_id, agent, turn_number, turn_name, model, created_at
      FROM turns
      WHERE run_id = ?
      ORDER BY turn_number ASC
    `).all(runId) as any[];

    const chat = {
      run: run,
      turns: turns.map(turn => {
        const messages = this.db.prepare(`
          SELECT id, turn_id, role, content, tokens_input, tokens_output, created_at
          FROM messages
          WHERE turn_id = ?
          ORDER BY created_at ASC
        `).all(turn.id) as any[];

        const toolCalls = this.db.prepare(`
          SELECT tc.id, tc.tool_name, tc.args, tc.created_at,
                 tr.result, tr.error, tr.created_at as result_created_at
          FROM tool_calls tc
          LEFT JOIN tool_results tr ON tc.id = tr.tool_call_id
          WHERE tc.turn_id = ?
          ORDER BY tc.created_at ASC
        `).all(turn.id) as any[];

        const costs = this.db.prepare(`
          SELECT model, input_tokens, output_tokens, cost_usd
          FROM turn_costs
          WHERE turn_id = ?
        `).get(turn.id) as any;

        return {
          ...turn,
          messages,
          toolCalls,
          costs
        };
      })
    };

    return chat;
  }

  getAllAgentStats(): any[] {
    return this.db.prepare(`
      SELECT name, enabled, model, schedule, total_runs, total_tokens, 
             total_cost_usd, last_run_id, last_run_at
      FROM agents
      ORDER BY last_run_at DESC NULLS LAST
    `).all() as any[];
  }

  updateRun(runId: string, updates: Partial<RunRecord>): void {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    values.push(runId);
    const stmt = this.db.prepare(`UPDATE runs SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  insertCost(cost: CostRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO costs (
        id, agent, run_id, timestamp, model, 
        input_tokens, output_tokens, total_tokens, 
        cost_usd, daily_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      cost.id,
      cost.agent,
      cost.run_id,
      cost.timestamp,
      cost.model,
      cost.input_tokens,
      cost.output_tokens,
      cost.total_tokens,
      cost.cost_usd,
      cost.daily_date
    );
  }

  updateAgentStats(agent: string, stats: Partial<AgentStats>): void {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (stats.total_runs !== undefined) {
      fields.push('total_runs = ?');
      values.push(stats.total_runs);
    }
    if (stats.total_tokens !== undefined) {
      fields.push('total_tokens = ?');
      values.push(stats.total_tokens);
    }
    if (stats.total_cost_usd !== undefined) {
      fields.push('total_cost_usd = ?');
      values.push(stats.total_cost_usd);
    }
    if (stats.last_run_id !== undefined) {
      fields.push('last_run_id = ?');
      values.push(stats.last_run_id);
    }
    if (stats.last_run_at !== undefined) {
      fields.push('last_run_at = ?');
      values.push(stats.last_run_at);
    }

    values.push(agent);
    const stmt = this.db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE name = ?`);
    stmt.run(...values);
  }

  getRuns(filters: RunFilters = {}): RunRecord[] {
    let query = 'SELECT * FROM runs WHERE 1=1';
    const params: any[] = [];

    if (filters.agent) {
      query += ' AND agent = ?';
      params.push(filters.agent);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.days) {
      query += ` AND created_at > datetime('now', '-${filters.days} days')`;
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as RunRecord[];
  }

  getAgentStats(agent?: string): AgentStats[] {
    let query = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];

    if (agent) {
      query += ' AND name = ?';
      params.push(agent);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as AgentStats[];
  }

  getDailyCosts(date: string): DailyCostBreakdown {
    const stmt = this.db.prepare(`
      SELECT agent, model, 
             SUM(input_tokens) as input_tokens,
             SUM(output_tokens) as output_tokens,
             SUM(cost_usd) as cost
      FROM costs
      WHERE daily_date = ?
      GROUP BY agent, model
      ORDER BY cost DESC
    `);

    const rows = stmt.all(date) as any[];
    const total_cost = rows.reduce((sum, row) => sum + (row.cost || 0), 0);

    return {
      date,
      total_cost,
      by_agent: rows.map((row) => ({
        agent: row.agent,
        model: row.model,
        input_tokens: row.input_tokens || 0,
        output_tokens: row.output_tokens || 0,
        cost: row.cost || 0
      }))
    };
  }

  getChatFile(runId: string): string | null {
    const stmt = this.db.prepare('SELECT chat_file FROM runs WHERE id = ?');
    const row = stmt.get(runId) as any;
    return row?.chat_file || null;
  }

  close(): void {
    this.db.close();
    logger.info('Database closed');
  }
}
