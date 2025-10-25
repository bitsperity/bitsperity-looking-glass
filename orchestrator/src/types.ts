export interface TurnConfig {
  id: number;
  name: string;
  model?: string;  // Override agent-level model
  max_tokens: number;
  mcps?: string[];  // e.g., ["satbase", "manifold"] - gives access to ALL tools of these MCPs
  prompt?: string;  // Inline prompt
  prompt_file?: string;  // External prompt file path
}

export interface AgentConfig {
  enabled: boolean;
  schedule: string;  // cron expression
  model: string;  // Default model
  rules_file?: string;  // Optional agent rules
  budget_daily_tokens: number;
  timeout_minutes: number;
  batch?: number;  // For parallel execution
  sector?: string;  // For analyst agents
  turns: TurnConfig[];
}

export interface AgentsConfig {
  orchestrator: {
    timezone: string;
  };
  budget: {
    daily_tokens: number;
    monthly_budget_usd: number;
  };
  mcps: Record<string, { command: string; args: string[] }>;
  agents: Record<string, AgentConfig>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any[];
}

export interface AgentRun {
  run_id: string;
  agent: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  duration_seconds?: number;
  chat_history: ChatMessage[];
  outputs: {
    created_thoughts?: string[];
    created_hypotheses?: string[];
  };
  tokens: {
    input: number;
    output: number;
    total: number;
    cost_usd: number;
  };
}

// Re-export from database module
export type { RunRecord, CostRecord, AgentStats } from './db/database.js';
