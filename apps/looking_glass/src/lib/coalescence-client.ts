// Orchestrator API (Port 3100): Runs, Stats, Dashboard, Costs
const ORCHESTRATOR_BASE = import.meta.env.VITE_COALESCENCE_BASE || 'http://localhost:3100';

// Coalescence API (Port 8084): Agent CRUD, Context, Insights, Messages
const COALESCENCE_API_BASE = import.meta.env.VITE_COALESCENCE_API_BASE || 'http://localhost:8084';

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

export interface AgentConfig {
  name: string;
  enabled: boolean;
  model: string;
  schedule: string;
  system_prompt?: string;
  max_tokens_per_turn?: number;
  max_steps: number;
  budget_daily_tokens: number;
  timeout_minutes: number;
  turns: Array<{
    id: number;
    name: string;
    model?: string;
    max_tokens: number;
    max_steps?: number;
    mcps?: string[];
    prompt?: string;
    prompt_file?: string;
    rules?: string[];
  }>;
  created_at?: string;
  updated_at?: string;
}

export class CoalescenceClient {
  private orchestratorUrl: string;
  private apiUrl: string;

  constructor(
    orchestratorUrl: string = ORCHESTRATOR_BASE,
    apiUrl: string = COALESCENCE_API_BASE
  ) {
    this.orchestratorUrl = orchestratorUrl;
    this.apiUrl = apiUrl;
  }

  async health(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${this.orchestratorUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }

  // ============= ORCHESTRATOR APIs (Port 3100) =============
  
  async getRuns(options?: { agent?: string; days?: number; status?: string }): Promise<{ runs: CoalescenceRun[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.agent) params.set('agent', options.agent);
    if (options?.days) params.set('days', String(options.days));
    if (options?.status) params.set('status', options.status);

    const res = await fetch(`${this.orchestratorUrl}/api/runs?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch runs: ${res.statusText}`);
    return res.json();
  }

  async getRun(id: string): Promise<RunDetail> {
    const res = await fetch(`${this.orchestratorUrl}/api/runs/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch run: ${res.statusText}`);
    return res.json();
  }

  async getRunChat(id: string): Promise<RunDetail> {
    return this.getRun(id); // Same endpoint, returns full chat with turns
  }

  async getRunTools(id: string): Promise<ToolBreakdown> {
    const res = await fetch(`${this.orchestratorUrl}/api/runs/${id}/tools/detailed`);
    if (!res.ok) throw new Error(`Failed to fetch tool details: ${res.statusText}`);
    return res.json();
  }

  async getRunToolsDetailed(id: string): Promise<ToolBreakdown> {
    // Alias for consistency, same endpoint
    return this.getRunTools(id);
  }

  async getCosts(date?: string): Promise<CoalescenceCostBreakdown> {
    const params = new URLSearchParams();
    if (date) params.set('date', date);

    const res = await fetch(`${this.orchestratorUrl}/api/costs?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch costs: ${res.statusText}`);
    return res.json();
  }

  async getDashboard(days: number = 7): Promise<DashboardStats> {
    const res = await fetch(`${this.orchestratorUrl}/api/stats/dashboard?days=${days}`);
    if (!res.ok) throw new Error(`Failed to fetch dashboard stats: ${res.statusText}`);
    return res.json();
  }

  async triggerAgent(agentName: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.orchestratorUrl}/api/agents/${agentName}/run`, {
      method: 'POST'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to trigger agent: ${res.statusText}`);
    }
    return res.json();
  }

  async getChat(runId: string): Promise<string> {
    const res = await fetch(`${this.orchestratorUrl}/api/chat/${runId}`);
    if (!res.ok) throw new Error(`Failed to fetch chat: ${res.statusText}`);
    return res.text();
  }

  // ============= COALESCENCE API - AGENT CRUD (Port 8084) =============
  
  async listAgents(): Promise<{ count: number; agents: AgentConfig[] }> {
    const res = await fetch(`${this.apiUrl}/v1/agents`);
    if (!res.ok) throw new Error(`Failed to list agents: ${res.statusText}`);
    return res.json();
  }

  async getAgent(name: string): Promise<AgentConfig> {
    const res = await fetch(`${this.apiUrl}/v1/agents/${name}`);
    if (!res.ok) throw new Error(`Failed to fetch agent: ${res.statusText}`);
    return res.json();
  }

  async createAgent(config: Omit<AgentConfig, 'created_at' | 'updated_at'>): Promise<{ status: string; agent: string }> {
    const res = await fetch(`${this.apiUrl}/v1/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || `Failed to create agent: ${res.statusText}`);
    }
    return res.json();
  }

  async updateAgent(name: string, updates: Partial<AgentConfig>): Promise<{ status: string; agent: AgentConfig }> {
    const res = await fetch(`${this.apiUrl}/v1/agents/${name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || `Failed to update agent: ${res.statusText}`);
    }
    return res.json();
  }

  async deleteAgent(name: string): Promise<{ status: string; agent: string }> {
    // Handle empty name case - use _empty as placeholder that gets handled specially
    const agentName = (!name || name.trim() === '') ? '_empty' : name;
    const url = `${this.apiUrl}/v1/agents/${encodeURIComponent(agentName)}`;
    
    const res = await fetch(url, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || `Failed to delete agent: ${res.statusText}`);
    }
    return res.json();
  }

  // Legacy: Get agent stats from orchestrator (for compatibility)
  async getAgents(): Promise<{ agents: CoalescenceAgentStats[] }> {
    const res = await fetch(`${this.orchestratorUrl}/api/agents`);
    if (!res.ok) throw new Error(`Failed to fetch agents: ${res.statusText}`);
    return res.json();
  }

  // ============= DEPRECATED YAML METHODS (for backward compatibility) =============
  
  /** @deprecated Use listAgents() instead */
  async getConfigAgents(): Promise<{ content: string; parsed: any }> {
    // Fallback: Try to load from new API and convert format
    try {
      const { agents } = await this.listAgents();
      return {
        content: JSON.stringify({ agents }, null, 2),
        parsed: { agents: Object.fromEntries(agents.map(a => [a.name, a])) }
      };
    } catch (e) {
      throw new Error(`Failed to load agents: ${e}`);
    }
  }

  /** @deprecated Use createAgent() or updateAgent() instead */
  async saveConfigAgents(yaml: string): Promise<{ success: boolean; message: string }> {
    throw new Error('YAML config is deprecated. Use createAgent/updateAgent methods instead.');
  }

  // ============= MODELS CONFIG =============
  
  async getModelsConfig(): Promise<{ content: string; parsed: any }> {
    const res = await fetch(`${this.orchestratorUrl}/api/config/models`);
    if (!res.ok) throw new Error(`Failed to fetch models config: ${res.statusText}`);
    return res.json();
  }

  async saveModelsConfig(yaml: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.orchestratorUrl}/api/config/models`, {
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

  async getModelPricing(modelName: string): Promise<{ input_mtok: number; output_mtok: number; notes?: string } | null> {
    try {
      const config = await this.getModelsConfig();
      const model = config.parsed?.models?.[modelName];
      return model?.pricing ? {
        input_mtok: model.pricing.input_mtok,
        output_mtok: model.pricing.output_mtok,
        notes: model.notes
      } : null;
    } catch (e) {
      console.warn('Failed to get model pricing:', e);
      return null;
    }
  }

  async getAllModels(): Promise<Record<string, { id: string; provider: string; pricing: any; notes?: string }>> {
    try {
      const config = await this.getModelsConfig();
      return config.parsed?.models || {};
    } catch (e) {
      console.warn('Failed to get all models:', e);
      return {};
    }
  }

  // ============= AGENT RELOAD =============
  
  async reloadAgents(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.orchestratorUrl}/api/agents/reload`, {
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
    const res = await fetch(`${this.orchestratorUrl}/api/rules`);
    if (!res.ok) throw new Error(`Failed to fetch rules: ${res.statusText}`);
    const data = await res.json();
    return data.rules || [];
  }

  async getRule(id: string): Promise<Rule> {
    const res = await fetch(`${this.orchestratorUrl}/api/rules/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch rule: ${res.statusText}`);
    const data = await res.json();
    return data.rule;
  }

  async createRule(name: string, content: string, description?: string): Promise<Rule> {
    const res = await fetch(`${this.orchestratorUrl}/api/rules`, {
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
    const res = await fetch(`${this.orchestratorUrl}/api/rules/${id}`, {
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
    const res = await fetch(`${this.orchestratorUrl}/api/rules/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to delete rule: ${res.statusText}`);
    }
  }

  async getTurnRules(turnId: number): Promise<Rule[]> {
    const res = await fetch(`${this.orchestratorUrl}/api/turns/${turnId}/rules`);
    if (!res.ok) throw new Error(`Failed to fetch turn rules: ${res.statusText}`);
    const data = await res.json();
    return data.rules || [];
  }

  async setTurnRules(turnId: number, ruleIds: string[]): Promise<Rule[]> {
    const res = await fetch(`${this.orchestratorUrl}/api/turns/${turnId}/rules`, {
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

  // ============= AGENT STATS =============
  
  async getAgentStats(agentName: string, days: number = 7): Promise<any> {
    const res = await fetch(`${this.orchestratorUrl}/api/stats/agent/${agentName}?days=${days}`);
    if (!res.ok) throw new Error(`Failed to fetch agent stats: ${res.statusText}`);
    return res.json();
  }

  async getCostBreakdown(days: number = 7): Promise<any> {
    const res = await fetch(`${this.orchestratorUrl}/api/stats/costs?days=${days}`);
    if (!res.ok) throw new Error(`Failed to fetch cost breakdown: ${res.statusText}`);
    return res.json();
  }

  async getTokenStats(days: number = 7): Promise<any> {
    const res = await fetch(`${this.orchestratorUrl}/api/stats/tokens?days=${days}`);
    if (!res.ok) throw new Error(`Failed to fetch token stats: ${res.statusText}`);
    return res.json();
  }

  // ============= CONTEXT SYSTEM (Coalescence API) =============
  
  async getRunContext(agentName: string, daysBack: number = 7): Promise<any> {
    const res = await fetch(`${this.apiUrl}/v1/context/${agentName}?days_back=${daysBack}`);
    if (!res.ok) throw new Error(`Failed to fetch run context: ${res.statusText}`);
    return res.json();
  }

  async saveRunContext(contextData: {
    agent_name: string;
    run_id: string;
    context_summary: string;
    kg_entities?: string[];
    manifold_thoughts?: string[];
  }): Promise<any> {
    const res = await fetch(`${this.apiUrl}/v1/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contextData)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to save context: ${res.statusText}`);
    }
    return res.json();
  }

  // ============= INSIGHTS SYSTEM (Coalescence API) =============
  
  async getInsights(agentName: string, daysBack: number = 7): Promise<any> {
    const res = await fetch(`${this.apiUrl}/v1/insights/${agentName}?days_back=${daysBack}`);
    if (!res.ok) throw new Error(`Failed to fetch insights: ${res.statusText}`);
    return res.json();
  }

  async saveInsight(insightData: {
    agent_name: string;
    insight: string;
    priority?: 'high' | 'medium' | 'low';
    run_id?: string;
    related_entities?: string[];
  }): Promise<any> {
    const res = await fetch(`${this.apiUrl}/v1/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insightData)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to save insight: ${res.statusText}`);
    }
    return res.json();
  }

  // ============= MESSAGES SYSTEM (Coalescence API) =============
  
  async getMessages(agentName: string, unreadOnly: boolean = true, fromAgent?: string): Promise<any> {
    const params = new URLSearchParams();
    params.set('unread_only', String(unreadOnly));
    if (fromAgent) params.set('from_agent', fromAgent);
    
    const res = await fetch(`${this.apiUrl}/v1/messages/${agentName}?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
    return res.json();
  }

  async sendMessage(messageData: {
    from_agent: string;
    to_agent: string; // 'all' for broadcast
    type: string; // 'insight', 'warning', 'question', 'data'
    content: string;
    related_entities?: string[];
  }): Promise<any> {
    const res = await fetch(`${this.apiUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to send message: ${res.statusText}`);
    }
    return res.json();
  }

  async markMessageRead(messageId: string): Promise<any> {
    const res = await fetch(`${this.apiUrl}/v1/messages/${messageId}/read`, {
      method: 'PATCH'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Failed to mark message read: ${res.statusText}`);
    }
    return res.json();
  }

  // ============= TOOLS BROWSER (Orchestrator API - Port 3100) =============
  
  async listAllTools(mcpName?: string): Promise<any> {
    // Tools are available from Orchestrator API, not Coalescence API
    const params = mcpName ? `/${mcpName}` : '';
    const res = await fetch(`${this.orchestratorUrl}/api/tools${params}`);
    if (!res.ok) throw new Error(`Failed to list tools: ${res.statusText}`);
    return res.json();
  }

  async listMcpTools(mcpName: string): Promise<any> {
    const res = await fetch(`${this.orchestratorUrl}/api/tools/${mcpName}`);
    if (!res.ok) throw new Error(`Failed to list MCP tools: ${res.statusText}`);
    return res.json();
  }

  parseJsonLines(ndjson: string): any[] {
    return ndjson
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  }
}

export const coalescenceClient = new CoalescenceClient();
