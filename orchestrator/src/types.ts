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
  agent?: string;  // Agent name
  enabled: boolean;
  schedule: string;  // cron expression
  model: string;  // CUSTOMIZABLE: haiku-3.5, haiku-4.5, sonnet-4.5, opus-4.1
  system_prompt?: string;  // System prompt with step-control guidance
  max_tokens_per_turn?: number;  // Default max tokens per turn (4000)
  rules_file?: string;  // Optional agent rules
  budget_daily_tokens: number;
  timeout_minutes: number;
  batch?: number;  // For parallel execution
  sector?: string;  // For analyst agents
  turns: TurnConfig[];
}

export interface MCPServerConfig {
  type: 'http';  // Only HTTP now
  url: string;  // e.g., http://localhost:3001/mcp
  description?: string;
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
  runId: string;
  status: 'success' | 'error';
  totalTokens: number;
  cost: number;
}

// Re-export from database module
export type { RunRecord, CostRecord, AgentStats } from './db/database.js';
