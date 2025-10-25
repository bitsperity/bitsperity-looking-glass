export interface TurnConfig {
  id: number;
  name: string;
  model?: string;  // Override agent-level model
  max_tokens: number;
  mcps?: string[];  // e.g., ["satbase", "manifold"]
  prompt?: string;  // Inline prompt
  prompt_file?: string;  // External prompt file path
}

export interface AgentConfig {
  enabled: boolean;
  schedule: string;  // cron expression
  model: string;  // CUSTOMIZABLE: haiku-3, haiku-3.5, haiku-4.5, sonnet-3.7, sonnet-4.5, opus-4.1
  rules_file?: string;  // Optional agent rules
  budget_daily_tokens: number;
  timeout_minutes: number;
  batch?: number;  // For parallel execution
  sector?: string;  // For analyst agents
  turns: TurnConfig[];
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface AgentsConfig {
  orchestrator: {
    timezone: string;
  };
  budget: {
    daily_tokens: number;
    monthly_budget_usd: number;
  };
  mcps: Record<string, MCPServerConfig>;
  agents: Record<string, AgentConfig>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any[];
}

export interface AgentRun {
  agent: string;
  runId: string;
  status: 'completed' | 'failed';
  tokens: {
    input: number;
    output: number;
    total: number;
    cost_usd: number;
  };
  duration: number;
  turns_completed: number;
}

// Re-export from database module
export type { RunRecord, CostRecord, AgentStats } from './db/database.js';
