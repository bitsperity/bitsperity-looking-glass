const BASE_URL = import.meta.env.VITE_COALESCENCE_BASE || 'http://localhost:3100';

export interface CoalescenceRun {
  id: string;
  agent: string;
  status: string;
  created_at: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  duration_seconds?: number;
}

export interface CoalescenceCost {
  agent: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

export interface CoalescenceAgentStats {
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

export interface CoalescenceCostBreakdown {
  date: string;
  total_cost: number;
  by_agent: CoalescenceCost[];
}

// New interfaces for complete run data
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ToolCall {
  index: number;
  name: string;
  status: 'success' | 'error' | 'pending';
  error: string | null;
  duration: { ms: number };
  args: Record<string, any>;
  result: any;
  timestamp: string;
}

export interface Turn {
  number: number;
  name: string;
  status: string;
  duration: { ms: number };
  tokens: { input: number; output: number; total: number };
  cost: number;
  toolCalls: ToolCall[];
  messages: Message[];
}

export interface RunDetail {
  meta: {
    runId: string;
    agent: string;
    model: string | null;
    status: string;
    createdAt: string;
    finishedAt: string;
    durationSeconds: number | null;
  };
  tokens: { input: number; output: number; total: number };
  cost: { usd: number; currency: string };
  execution: { turnsCompleted: number; turnsTotal: number; totalToolCalls: number };
  turns: Turn[];
}

export interface ToolBreakdown {
  runId: string;
  totalTools: number;
  byStatus: { success: number; error: number; pending: number };
  byMcp: Record<string, { count: number; success: number; error: number; avgDuration: number; totalDuration: number }>;
  timeline: Array<{
    turnNumber: number;
    toolName: string;
    status: string;
    duration: number;
    timestamp: string;
    error: string | null;
    args: Record<string, any>;
    resultSize: number;
  }>;
}

export interface DashboardStats {
  timeframe: string;
  total: { agents: number; runs: number; tokens: number; cost: number };
  byAgent: Record<string, { runs: number; tokens: number; cost: number; lastRun: string | null }>;
  byDate: Array<{
    date: string;
    runs: number;
    tokens: number;
    cost: number;
    byAgent: any;
  }>;
}

export interface Rule {
  id: string;
  name: string;
  content: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export class CoalescenceClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async health(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }

  async getRuns(options?: { agent?: string; days?: number; status?: string }): Promise<{ runs: CoalescenceRun[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.agent) params.set('agent', options.agent);
    if (options?.days) params.set('days', String(options.days));
    if (options?.status) params.set('status', options.status);

    const res = await fetch(`${this.baseUrl}/api/runs?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch runs: ${res.statusText}`);
    return res.json();
  }

  async getRun(id: string): Promise<RunDetail> {
    const res = await fetch(`${this.baseUrl}/api/runs/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch run: ${res.statusText}`);
    return res.json();
  }

  async getRunChat(id: string): Promise<RunDetail> {
    return this.getRun(id); // Same endpoint, returns full chat with turns
  }

  async getRunTools(id: string): Promise<ToolBreakdown> {
    const res = await fetch(`${this.baseUrl}/api/runs/${id}/tools/detailed`);
    if (!res.ok) throw new Error(`Failed to fetch tool details: ${res.statusText}`);
    return res.json();
  }

  async getAgents(): Promise<{ agents: CoalescenceAgentStats[] }> {
    const res = await fetch(`${this.baseUrl}/api/agents`);
    if (!res.ok) throw new Error(`Failed to fetch agents: ${res.statusText}`);
    return res.json();
  }

  async getCosts(date?: string): Promise<CoalescenceCostBreakdown> {
    const params = new URLSearchParams();
    if (date) params.set('date', date);

    const res = await fetch(`${this.baseUrl}/api/costs?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch costs: ${res.statusText}`);
    return res.json();
  }

  async getDashboard(days: number = 7): Promise<DashboardStats> {
    const res = await fetch(`${this.baseUrl}/api/stats/dashboard?days=${days}`);
    if (!res.ok) throw new Error(`Failed to fetch dashboard stats: ${res.statusText}`);
    return res.json();
  }

  async triggerAgent(agentName: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/agents/${agentName}/run`, {
      method: 'POST'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to trigger agent: ${res.statusText}`);
    }
    return res.json();
  }

  async getChat(runId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat/${runId}`);
    if (!res.ok) throw new Error(`Failed to fetch chat: ${res.statusText}`);
    return res.text();
  }

  async getConfigAgents(): Promise<{ content: string; parsed: any }> {
    const res = await fetch(`${this.baseUrl}/api/config/agents`);
    if (!res.ok) throw new Error(`Failed to fetch agents config: ${res.statusText}`);
    return res.json();
  }

  async saveConfigAgents(yaml: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/config/agents`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/yaml' },
      body: yaml
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to save agents config: ${res.statusText}`);
    }
    return res.json();
  }

  async getConfigModels(): Promise<{ content: string; parsed: any }> {
    const res = await fetch(`${this.baseUrl}/api/config/models`);
    if (!res.ok) throw new Error(`Failed to fetch models config: ${res.statusText}`);
    return res.json();
  }

  async saveConfigModels(yaml: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/config/models`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/yaml' },
      body: yaml
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to save models config: ${res.statusText}`);
    }
    return res.json();
  }

  async reloadAgents(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/agents/reload`, {
      method: 'POST'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to reload agents: ${res.statusText}`);
    }
    return res.json();
  }

  // ============= RULES API METHODS =============

  async getAllRules(): Promise<Rule[]> {
    const res = await fetch(`${this.baseUrl}/api/rules`);
    if (!res.ok) throw new Error(`Failed to fetch rules: ${res.statusText}`);
    const data = await res.json();
    return data.rules || [];
  }

  async getRule(id: string): Promise<Rule> {
    const res = await fetch(`${this.baseUrl}/api/rules/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch rule: ${res.statusText}`);
    const data = await res.json();
    return data.rule;
  }

  async createRule(name: string, content: string, description?: string): Promise<Rule> {
    const res = await fetch(`${this.baseUrl}/api/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, description })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to create rule: ${res.statusText}`);
    }
    const data = await res.json();
    return data.rule;
  }

  async updateRule(id: string, updates: Partial<Omit<Rule, 'id' | 'created_at' | 'updated_at'>>): Promise<Rule> {
    const res = await fetch(`${this.baseUrl}/api/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to update rule: ${res.statusText}`);
    }
    const data = await res.json();
    return data.rule;
  }

  async deleteRule(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/rules/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to delete rule: ${res.statusText}`);
    }
  }

  async getTurnRules(turnId: number): Promise<Rule[]> {
    const res = await fetch(`${this.baseUrl}/api/turns/${turnId}/rules`);
    if (!res.ok) throw new Error(`Failed to fetch turn rules: ${res.statusText}`);
    const data = await res.json();
    return data.rules || [];
  }

  async setTurnRules(turnId: number, ruleIds: string[]): Promise<Rule[]> {
    const res = await fetch(`${this.baseUrl}/api/turns/${turnId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to set turn rules: ${res.statusText}`);
    }
    const data = await res.json();
    return data.rules || [];
  }

  parseJsonLines(ndjson: string): any[] {
    return ndjson
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  }
}

export const coalescenceClient = new CoalescenceClient();
