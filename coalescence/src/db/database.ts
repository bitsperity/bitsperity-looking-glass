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

  insertMessage(turnId: number, runId: string, role: string, content: string, tokensInput?: number, tokensOutput?: number, messageType: string = 'text'): number {
    const stmt = this.db.prepare(`
      INSERT INTO messages (turn_id, run_id, role, content, message_type, tokens_input, tokens_output)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(turnId, runId, role, content, messageType, tokensInput, tokensOutput);
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

  // Insert tool call - logs BEFORE execution with status 'pending'
  insertToolCallStart(
    runId: string,
    turnId: number,
    toolUseId: string,
    toolName: string,
    toolInput: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO tool_calls (
        turn_id, run_id, tool_name, tool_input, tool_output, 
        duration_ms, status, error, tool_use_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      turnId,
      runId,
      toolName,
      toolInput,
      null, // output pending
      0,
      'pending',
      null,
      toolUseId
    );
  }

  // Update tool call AFTER execution with result
  updateToolCallComplete(
    toolUseId: string,
    toolOutput: string,
    durationMs: number,
    status: 'success' | 'error' = 'success',
    error?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE tool_calls 
      SET tool_output = ?,
          duration_ms = ?,
          status = ?,
          error = ?
      WHERE tool_use_id = ?
    `);

    stmt.run(
      toolOutput,
      durationMs,
      status,
      error || null,
      toolUseId
    );
  }

  // Get complete chat history for a run
  getChatHistoryComplete(runId: string): any {
    const run = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as any;
    if (!run) return null;

    const turns = this.db.prepare(`
      SELECT * FROM turn_details WHERE run_id = ? ORDER BY turn_number ASC
    `).all(runId) as any[];

    return {
      runId: run.id,
      agent: run.agent,
      model: run.model_used,
      status: run.status,
      createdAt: run.created_at,
      finishedAt: run.finished_at,
      durationSeconds: run.duration_seconds,
      totalTokens: run.total_tokens,
      inputTokens: run.input_tokens,
      outputTokens: run.output_tokens,
      costUsd: run.cost_usd,
      turnsTotal: run.turns_total,
      turnsCompleted: run.turns_completed,
      turns: turns.map((turn: any) => ({
        number: turn.turn_number,
        name: turn.turn_name,
        model: turn.model,
        status: turn.status,
        duration: { ms: turn.duration_ms },
        tokens: {
          input: turn.input_tokens,
          output: turn.output_tokens,
          total: turn.total_tokens
        },
        cost: turn.cost_usd,
        messages: this.db.prepare(`
          SELECT role, content, message_type, created_at as timestamp FROM messages 
          WHERE run_id = ? AND turn_id = (SELECT id FROM turns WHERE run_id = ? AND turn_number = ?)
          ORDER BY created_at ASC
        `).all(runId, runId, turn.turn_number) as any[],
        toolCalls: this.db.prepare(`
          SELECT 
            tool_name as name,
            status,
            duration_ms as duration,
            tool_input as args,
            tool_output as result,
            error,
            created_at as timestamp
          FROM tool_calls 
          WHERE run_id = ? AND turn_id = (SELECT id FROM turns WHERE run_id = ? AND turn_number = ?)
          ORDER BY created_at ASC
        `).all(runId, runId, turn.turn_number) as any[]
      }))
    };
  }

  // Get aggregated stats for an agent
  getAgentStatsSummary(agentName: string, days: number = 7): any {
    const runs = this.db.prepare(`
      SELECT 
        COUNT(*) as totalRuns,
        SUM(total_tokens) as totalTokens,
        SUM(cost_usd) as totalCost,
        AVG(total_tokens) as avgTokensPerRun,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successfulRuns
      FROM runs 
      WHERE agent = ? AND created_at >= datetime('now', '-' || ? || ' days')
    `).get(agentName, days) as any;

    return {
      agentName,
      timeframe: `${days} days`,
      totalRuns: runs.totalRuns || 0,
      totalTokens: runs.totalTokens || 0,
      totalCost: (runs.totalCost || 0).toFixed(4),
      avgTokensPerRun: Math.round(runs.avgTokensPerRun || 0),
      successRate: runs.totalRuns > 0 ? ((runs.successfulRuns / runs.totalRuns) * 100).toFixed(1) : '0'
    };
  }

  // Get cost breakdown by agent and date
  getCostBreakdown(days: number = 7): any[] {
    return this.db.prepare(`
      SELECT 
        DATE(created_at) as date,
        agent,
        SUM(cost_usd) as totalCost,
        SUM(total_tokens) as totalTokens,
        COUNT(*) as numRuns
      FROM runs 
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at), agent
      ORDER BY date DESC, agent ASC
    `).all(days) as any[];
  }

  // Insert turn details - creates entry in turns table and returns turn_id
  insertTurnDetails(
    runId: string,
    turnNumber: number,
    turnName: string,
    status: 'pending' | 'success' | 'error' = 'pending',
    errorMessage?: string,
    model?: string
  ): number {
    // First insert into turns table to get a turn_id
    const turnStmt = this.db.prepare(`
      INSERT INTO turns (
        run_id, agent, turn_number, turn_name, model, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const turnResult = turnStmt.run(runId, 'unknown', turnNumber, turnName, model || null);
    const turnId = turnResult.lastInsertRowid as number;
    
    // Then insert into turn_details for detailed tracking
    const detailStmt = this.db.prepare(`
      INSERT INTO turn_details (
        run_id, turn_number, turn_name, model, status, error_message, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    detailStmt.run(runId, turnNumber, turnName, model || null, status, errorMessage || null);
    
    return turnId;
  }

  // Update turn details with completion info
  completeTurnDetails(
    runId: string,
    turnNumber: number,
    inputTokens: number,
    outputTokens: number,
    costUsd: number,
    numToolCalls: number,
    status: 'success' | 'error' = 'success',
    errorMessage?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE turn_details 
      SET finished_at = CURRENT_TIMESTAMP,
          duration_ms = CAST((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 86400000 AS INTEGER),
          input_tokens = ?,
          output_tokens = ?,
          total_tokens = ? + ?,
          cost_usd = ?,
          num_tool_calls = ?,
          status = ?,
          error_message = ?
      WHERE run_id = ? AND turn_number = ?
    `);

    stmt.run(
      inputTokens,
      outputTokens,
      inputTokens,
      outputTokens,
      costUsd,
      numToolCalls,
      status,
      errorMessage || null,
      runId,
      turnNumber
    );
  }

  // Update run progress during execution (used to update tokens/costs for running runs)
  updateRunProgress(
    runId: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    turnsCompleted: number
  ): void {
    const stmt = this.db.prepare(`
      UPDATE runs
      SET 
        input_tokens = ?,
        output_tokens = ?,
        total_tokens = ?,
        cost_usd = ?,
        turns_completed = ?
      WHERE id = ?
    `);

    stmt.run(
      inputTokens,
      outputTokens,
      inputTokens + outputTokens,
      cost,
      turnsCompleted,
      runId
    );
  }

  // Update run with final statistics after all turns complete
  completeRun(
    runId: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    turnsCompleted: number,
    status: 'success' | 'error' = 'success',
    errorMessage?: string,
    durationSeconds?: number,
    modelUsed?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE runs
      SET 
        status = ?,
        finished_at = CURRENT_TIMESTAMP,
        input_tokens = ?,
        output_tokens = ?,
        total_tokens = ?,
        cost_usd = ?,
        turns_completed = ?,
        error_message = ?,
        duration_seconds = ?,
        model_used = ?
      WHERE id = ?
    `);

    stmt.run(
      status,
      inputTokens,
      outputTokens,
      inputTokens + outputTokens,
      cost,
      turnsCompleted,
      errorMessage || null,
      durationSeconds || null,
      modelUsed || null,
      runId
    );
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

  // Get dashboard stats aggregated from runs table (not agents table)
  getDashboardStats(days: number = 7): any {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffISO = cutoffDate.toISOString();

    // Get all runs from the last N days
    const runsStmt = this.db.prepare(`
      SELECT 
        agent,
        COUNT(*) as num_runs,
        SUM(total_tokens) as total_tokens,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cost_usd) as total_cost,
        MAX(created_at) as last_run_at
      FROM runs
      WHERE created_at > ?
      GROUP BY agent
      ORDER BY total_cost DESC
    `);
    const agentStats = runsStmt.all(cutoffISO) as any[];

    // Get total stats across all agents
    const totalStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as num_runs,
        COUNT(DISTINCT agent) as num_agents,
        SUM(total_tokens) as total_tokens,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cost_usd) as total_cost
      FROM runs
      WHERE created_at > ?
    `);
    const totals = totalStmt.get(cutoffISO) as any;

    // Get daily breakdown
    const dailyStmt = this.db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as num_runs,
        SUM(total_tokens) as total_tokens,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cost_usd) as total_cost
      FROM runs
      WHERE created_at > ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    const dailyBreakdown = dailyStmt.all(cutoffISO) as any[];

    return {
      timeframe: `${days} days`,
      total: {
        agents: totals?.num_agents || 0,
        runs: totals?.num_runs || 0,
        tokens: totals?.total_tokens || 0,
        cost: parseFloat((totals?.total_cost || 0).toFixed(4))
      },
      byAgent: Object.fromEntries(
        (agentStats || []).map(stat => [
          stat.agent,
          {
            runs: stat.num_runs,
            tokens: stat.total_tokens || 0,
            cost: parseFloat((stat.total_cost || 0).toFixed(4)),
            lastRun: stat.last_run_at
          }
        ])
      ),
      byDate: (dailyBreakdown || []).map(day => ({
        date: day.date,
        runs: day.num_runs,
        tokens: day.total_tokens || 0,
        cost: parseFloat((day.total_cost || 0).toFixed(4))
      }))
    };
  }

  // ============= RULES MANAGEMENT =============

  createRule(id: string, name: string, content: string, description?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO rules (id, name, content, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    stmt.run(id, name, content, description || null);
  }

  updateRule(id: string, name?: string, content?: string, description?: string): void {
    let query = 'UPDATE rules SET updated_at = datetime(\'now\')';
    const params: any[] = [];

    if (name !== undefined) {
      query += ', name = ?';
      params.push(name);
    }

    if (content !== undefined) {
      query += ', content = ?';
      params.push(content);
    }

    if (description !== undefined) {
      query += ', description = ?';
      params.push(description);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const stmt = this.db.prepare(query);
    stmt.run(...params);
  }

  deleteRule(id: string): void {
    const stmt = this.db.prepare('DELETE FROM rules WHERE id = ?');
    stmt.run(id);
  }

  getRule(id: string): any {
    const stmt = this.db.prepare('SELECT * FROM rules WHERE id = ?');
    return stmt.get(id);
  }

  getRuleByName(name: string): any {
    const stmt = this.db.prepare('SELECT * FROM rules WHERE name = ?');
    return stmt.get(name);
  }

  getAllRules(): any[] {
    const stmt = this.db.prepare('SELECT * FROM rules ORDER BY name');
    return stmt.all();
  }

  getTurnRules(turnId: number): any[] {
    const stmt = this.db.prepare(`
      SELECT r.* FROM rules r
      INNER JOIN turn_rules tr ON r.id = tr.rule_id
      WHERE tr.turn_id = ?
      ORDER BY tr.order_index ASC
    `);
    return stmt.all(turnId);
  }

  setTurnRules(turnId: number, ruleIds: string[]): void {
    // Clear existing rules for this turn
    const deleteStmt = this.db.prepare('DELETE FROM turn_rules WHERE turn_id = ?');
    deleteStmt.run(turnId);

    // Insert new rules with order
    if (ruleIds.length > 0) {
      const insertStmt = this.db.prepare(`
        INSERT INTO turn_rules (turn_id, rule_id, order_index, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      ruleIds.forEach((ruleId, index) => {
        insertStmt.run(turnId, ruleId, index);
      });
    }
  }

  // ============= AGENT CONFIGS MANAGEMENT =============

  saveAgentConfig(agentName: string, config: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO agent_configs (
        name, enabled, model, schedule, system_prompt,
        max_tokens_per_turn, max_steps, budget_daily_tokens,
        timeout_minutes, config_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        enabled = excluded.enabled,
        model = excluded.model,
        schedule = excluded.schedule,
        system_prompt = excluded.system_prompt,
        max_tokens_per_turn = excluded.max_tokens_per_turn,
        max_steps = excluded.max_steps,
        budget_daily_tokens = excluded.budget_daily_tokens,
        timeout_minutes = excluded.timeout_minutes,
        config_json = excluded.config_json,
        updated_at = datetime('now')
    `);
    stmt.run(
      agentName,
      config.enabled ?? true,
      config.model,
      config.schedule,
      config.system_prompt || null,
      config.max_tokens_per_turn || null,
      config.max_steps || 5,
      config.budget_daily_tokens,
      config.timeout_minutes,
      JSON.stringify(config)
    );
  }

  getAgentConfig(agentName: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM agent_configs WHERE name = ?');
    const row = stmt.get(agentName) as any;
    if (!row) return null;

    // Load turns
    const turnsStmt = this.db.prepare(`
      SELECT * FROM agent_turns 
      WHERE agent_name = ? 
      ORDER BY order_index ASC
    `);
    const turns = turnsStmt.all(agentName) as any[];

    // Parse config
    const config = JSON.parse(row.config_json);
    config.turns = turns.map(t => ({
      id: t.turn_id,
      name: t.turn_name,
      model: t.model,
      max_tokens: t.max_tokens,
      max_steps: t.max_steps,
      mcps: t.mcps ? JSON.parse(t.mcps) : [],
      prompt: t.prompt,
      prompt_file: t.prompt_file,
      rules: t.rules ? JSON.parse(t.rules) : []
    }));

    return {
      agent: agentName,
      enabled: row.enabled === 1,
      model: row.model,
      schedule: row.schedule,
      system_prompt: row.system_prompt,
      max_tokens_per_turn: row.max_tokens_per_turn,
      max_steps: row.max_steps,
      budget_daily_tokens: row.budget_daily_tokens,
      timeout_minutes: row.timeout_minutes,
      turns: config.turns,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  listAgentConfigs(): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        ac.*,
        a.last_run_at,
        a.last_run_id,
        a.total_runs,
        a.total_tokens,
        a.total_cost_usd
      FROM agent_configs ac
      LEFT JOIN agents a ON ac.name = a.name
      ORDER BY ac.created_at DESC
    `);
    return stmt.all() as any[];
  }

  updateAgentConfig(agentName: string, updates: any): void {
    const fields: string[] = ['updated_at = datetime(\'now\')'];
    const values: any[] = [];

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.model !== undefined) {
      fields.push('model = ?');
      values.push(updates.model);
    }
    if (updates.schedule !== undefined) {
      fields.push('schedule = ?');
      values.push(updates.schedule);
    }
    if (updates.system_prompt !== undefined) {
      fields.push('system_prompt = ?');
      values.push(updates.system_prompt);
    }
    if (updates.max_tokens_per_turn !== undefined) {
      fields.push('max_tokens_per_turn = ?');
      values.push(updates.max_tokens_per_turn);
    }
    if (updates.max_steps !== undefined) {
      fields.push('max_steps = ?');
      values.push(updates.max_steps);
    }
    if (updates.budget_daily_tokens !== undefined) {
      fields.push('budget_daily_tokens = ?');
      values.push(updates.budget_daily_tokens);
    }
    if (updates.timeout_minutes !== undefined) {
      fields.push('timeout_minutes = ?');
      values.push(updates.timeout_minutes);
    }
    if (updates.config_json !== undefined) {
      fields.push('config_json = ?');
      values.push(typeof updates.config_json === 'string' ? updates.config_json : JSON.stringify(updates.config_json));
    }

    if (fields.length === 1) return; // Only updated_at

    values.push(agentName);
    const stmt = this.db.prepare(`UPDATE agent_configs SET ${fields.join(', ')} WHERE name = ?`);
    stmt.run(...values);
  }

  deleteAgentConfig(agentName: string): void {
    const stmt = this.db.prepare('DELETE FROM agent_configs WHERE name = ?');
    stmt.run(agentName);
  }

  saveAgentTurns(agentName: string, turns: any[]): void {
    // Delete existing turns
    const deleteStmt = this.db.prepare('DELETE FROM agent_turns WHERE agent_name = ?');
    deleteStmt.run(agentName);

    // Insert new turns
    if (turns.length > 0) {
      const insertStmt = this.db.prepare(`
        INSERT INTO agent_turns (
          agent_name, turn_id, turn_name, model, max_tokens, max_steps,
          mcps, prompt, prompt_file, rules, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      turns.forEach((turn, index) => {
        insertStmt.run(
          agentName,
          turn.id,
          turn.name,
          turn.model || null,
          turn.max_tokens || null,
          turn.max_steps || null,
          turn.mcps ? JSON.stringify(turn.mcps) : null,
          turn.prompt || null,
          turn.prompt_file || null,
          turn.rules ? JSON.stringify(turn.rules) : null,
          index
        );
      });
    }
  }

  // ============= INSIGHTS MANAGEMENT =============

  saveInsight(insightId: string, agentName: string, insight: string, priority: string = 'medium', runId?: string, relatedEntities?: string[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO insights (id, agent_name, run_id, insight, priority, related_entities)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      insightId,
      agentName,
      runId || null,
      insight,
      priority,
      relatedEntities ? JSON.stringify(relatedEntities) : null
    );
  }

  getInsights(agentName: string, daysBack: number = 7): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM insights
      WHERE agent_name = ? AND created_at >= datetime('now', '-' || ? || ' days')
      ORDER BY created_at DESC
    `);
    return stmt.all(agentName, daysBack) as any[];
  }

  // ============= MESSAGES MANAGEMENT =============

  saveMessage(messageId: string, fromAgent: string, toAgent: string, type: string, content: string, relatedEntities?: string[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO agent_messages (id, from_agent, to_agent, type, content, related_entities)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      messageId,
      fromAgent,
      toAgent,
      type,
      content,
      relatedEntities ? JSON.stringify(relatedEntities) : null
    );
  }

  getMessages(agentName: string, unreadOnly: boolean = true, fromAgent?: string): any[] {
    let query = `
      SELECT * FROM agent_messages
      WHERE (to_agent = ? OR to_agent = 'all')
    `;
    const params: any[] = [agentName];

    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }
    if (fromAgent) {
      query += ' AND from_agent = ?';
      params.push(fromAgent);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as any[];
  }

  markMessageRead(messageId: string): void {
    const stmt = this.db.prepare('UPDATE agent_messages SET read_at = datetime(\'now\') WHERE id = ?');
    stmt.run(messageId);
  }

  // ============= CONTEXT MANAGEMENT =============

  saveRunContext(contextId: string, agentName: string, runId: string, contextSummary: string, kgEntities?: any[], manifoldThoughts?: any[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO run_context_cache (id, agent_name, run_id, context_summary, kg_entities, manifold_thoughts)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      contextId,
      agentName,
      runId,
      contextSummary,
      kgEntities ? JSON.stringify(kgEntities) : null,
      manifoldThoughts ? JSON.stringify(manifoldThoughts) : null
    );
  }

  getRunContext(agentName: string, daysBack: number = 7): any {
    // Get recent runs
    const runsStmt = this.db.prepare(`
      SELECT * FROM runs
      WHERE agent = ? AND created_at >= datetime('now', '-' || ? || ' days')
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const runs = runsStmt.all(agentName, daysBack) as any[];

    // Get recent insights
    const insights = this.getInsights(agentName, daysBack);

    // Get recent messages
    const messages = this.getMessages(agentName, false);

    // Build context summary
    const summary = `Recent runs: ${runs.length}, Insights: ${insights.length}, Messages: ${messages.length}`;

    return {
      summary,
      runs: runs.slice(0, 5), // Last 5 runs
      insights: insights.slice(0, 10), // Last 10 insights
      messages: messages.slice(0, 10) // Last 10 messages
    };
  }

  close(): void {
    this.db.close();
    logger.info('Database closed');
  }
}
