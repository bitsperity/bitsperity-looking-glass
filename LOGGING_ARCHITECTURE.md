# Orchestrator Logging Architecture - Frontend Ready

## Problem with Current Approach
- **Excessive Files**: 1 JSONL file per agent run = 100s of files per day  
- **No Aggregation**: Can't efficiently query across runs
- **Frontend Unfriendly**: Too many small files to load/query
- **Cost Tracking**: Scattered across files, hard to aggregate
- **Not Scalable**: 1000 runs/day = 1000 files/day

## Solution: SQLite + JSONL Hybrid

### Core Principle
- **SQLite** for structured queries, aggregation, cost tracking, analytics
- **JSONL** for immutable chat audit trail (one per run)
- **Frontend-Ready**: SQL API for filtering, sorting, cost analysis

---

## 1. Database Schema (SQLite: `orchestration.db`)

### Table: \`runs\`
```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'completed', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  duration_seconds REAL,
  
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  model_used TEXT,
  
  turns_completed INTEGER DEFAULT 0,
  turns_total INTEGER DEFAULT 0,
  error_message TEXT,
  chat_file TEXT,  -- Path to JSONL
  
  FOREIGN KEY(agent) REFERENCES agents(name)
);
CREATE INDEX idx_runs_agent ON runs(agent);
CREATE INDEX idx_runs_created_at ON runs(created_at);
CREATE INDEX idx_runs_status ON runs(status);
```

### Table: \`agents\`
```sql
CREATE TABLE agents (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT 1,
  model TEXT,
  schedule TEXT,
  budget_daily_tokens INTEGER,
  
  total_runs INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  last_run_id TEXT,
  last_run_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: \`costs\`
```sql
CREATE TABLE costs (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  run_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd REAL,
  
  daily_date TEXT,  -- YYYY-MM-DD for daily aggregation
  
  FOREIGN KEY(agent) REFERENCES agents(name),
  FOREIGN KEY(run_id) REFERENCES runs(id)
);
Create INDEX idx_costs_agent ON costs(agent);
CREATE INDEX idx_costs_daily_date ON costs(daily_date);
```

---

## 2. Chat Log Format (JSONL)

### File Structure
```
logs/chats/{YYYY-MM-DD}/{run_id}.jsonl
```

### Each line: 1 chat event
```json
{
  "timestamp": "2025-10-25T11:22:14.599Z",
  "run_id": "discovery__2025-10-25T09-07-30-764Z__363b556c",
  "agent": "discovery",
  "turn": 1,
  "turn_name": "load_watchlist",
  
  "type": "message|tool_call|tool_result|error",
  "role": "user|assistant|system|tool",
  
  "content": "Load your watchlist from Satbase...",
  
  "tokens": {"input": 355, "output": 145, "total": 500},
  "cost_usd": 0.00153,
  
  "metadata": {
    "model": "haiku-3.5",
    "tool_calls": ["satbase_get_watchlist"],
    "duration_ms": 2500
  }
}
```

---

## 3. Frontend Query API

### REST Endpoints

**GET /api/agents** - All agents with stats
```json
{
  "agents": [
    {
      "name": "discovery",
      "status": "running",
      "total_runs": 24,
      "total_cost": 0.156,
      "last_run": "2025-10-25T11:22:00Z",
      "model": "haiku-3.5"
    }
  ]
}
```

**GET /api/runs?agent=X&days=7&status=completed** - Recent runs
```json
{
  "runs": [
    {
      "id": "discovery__2025-10-25T09-07-30-764Z__363b556c",
      "agent": "discovery",
      "status": "completed",
      "created_at": "2025-10-25T11:22:14.599Z",
      "duration_seconds": 15.2,
      "tokens": {"input": 1929, "output": 1067, "total": 2996},
      "cost": 0.005843
    }
  ]
}
```

**GET /api/costs?date=2025-10-25** - Daily cost breakdown
```json
{
  "date": "2025-10-25",
  "total_cost": 0.0337,
  "by_agent": [
    {
      "agent": "analyst_biotech",
      "model": "haiku-3.5",
      "input_tokens": 2235,
      "output_tokens": 835,
      "cost": 0.005128
    }
  ]
}
```

**GET /api/chat/{runId}** - Stream chat JSONL
```
Returns JSONL file for streaming to frontend
One message per line
```

---

## 4. Benefits vs Old Approach

| Feature | Old (1000s JSONL files) | New (SQLite + Chat JSONL) |
|---------|--------------------------|--------------------------|
| Query Speed | O(n) file scans | O(1) indexed SQL |
| Daily Cost Aggregation | Manual code | 1 SQL query |
| Agent Statistics | Scattered | Live table |
| Storage | ~5MB/day files | 1DB + chats |
| Frontend Load | All files in memory | API queries |
| Scalability | ~100 runs/day max | 10,000+ runs/day OK |
| Analytics | Very hard | SQL GROUP BY |

---

## 5. Implementation Plan

### Phase 1: Logger Class (Week 1)
```
orchestrator/src/orchestration-logger.ts
- OrchestrationLogger class
- SQLite initialization
- JSONL writing
- Cost calculation and tracking
```

### Phase 2: Update Agent Runner (Week 1)
```
orchestrator/src/agent-runner.ts
- Replace old logger with OrchestrationLogger
- Log each turn, message, tool call
- Update cost calculation
```

### Phase 3: API Endpoints (Week 2)
```
orchestrator/src/api/
- GET /api/agents
- GET /api/runs
- GET /api/costs
- GET /api/chat/{runId}
```

### Phase 4: Frontend Integration (Week 2+)
```
Start building frontend dashboard with:
- Agent status overview
- Run history with filters
- Real-time cost tracking
- Chat log viewer
```

---

## 6. Code Structure

```typescript
class OrchestrationLogger {
  private db: Database;
  
  async logRunStart(agent: string, runId: string, config: AgentConfig);
  async logMessage(runId: string, turn: number, role: string, content: string);
  async logToolCall(runId: string, turn: number, toolName: string, args: any);
  async logToolResult(runId: string, turn: number, result: any);
  async logRunEnd(runId: string, status: string, tokens: TokenUsage, cost: number);
  
  // Analytics
  async getAgentStats(agent: string): Promise<AgentStats>;
  async getDailyCosts(date: string): Promise<DailyCostBreakdown>;
  async getTotalCosts(agent?: string, days?: number): Promise<number>;
}
```

---

## 7. Next Steps

1. **Today**: Design approved ✓
2. **Tomorrow**: Implement OrchestrationLogger class
3. **Day 3**: Update agent-runner to use new logger
4. **Day 4**: Add API endpoints
5. **Day 5+**: Frontend development

**This unblocks frontend development with proper data infrastructure!**
