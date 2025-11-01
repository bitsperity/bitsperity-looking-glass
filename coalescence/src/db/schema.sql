CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,
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
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs(agent);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

CREATE TABLE IF NOT EXISTS turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  turn_name TEXT,
  model TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
  UNIQUE(run_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_turns_run_id ON turns(run_id);
CREATE INDEX IF NOT EXISTS idx_turns_agent ON turns(agent);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turn_id INTEGER NOT NULL,
  run_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',  -- 'system', 'rules', 'user', 'assistant'
  tokens_input INTEGER,
  tokens_output INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_turn_id ON messages(turn_id);
CREATE INDEX IF NOT EXISTS idx_messages_run_id ON messages(run_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

CREATE TABLE IF NOT EXISTS tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turn_id INTEGER NOT NULL,
  run_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_schema TEXT,
  args TEXT,
  tool_input TEXT,  -- Full JSON arguments passed to tool
  tool_output TEXT,  -- Full JSON result from tool
  tool_use_id TEXT,  -- Claude's tool_use block ID for updates
  duration_ms INTEGER,  -- Tool execution time
  status TEXT DEFAULT 'pending',  -- 'pending', 'success', 'error'
  error TEXT,  -- Error message if failed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
  UNIQUE(tool_use_id)  -- Ensure each tool_use_id is logged once
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_turn_id ON tool_calls(turn_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_run_id ON tool_calls(run_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_name ON tool_calls(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_use_id ON tool_calls(tool_use_id);

CREATE TABLE IF NOT EXISTS tool_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_call_id INTEGER NOT NULL,
  turn_id INTEGER NOT NULL,
  run_id TEXT NOT NULL,
  result TEXT,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_call_id) REFERENCES tool_calls(id) ON DELETE CASCADE,
  FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tool_results_tool_call_id ON tool_results(tool_call_id);
CREATE INDEX IF NOT EXISTS idx_tool_results_turn_id ON tool_results(turn_id);
CREATE INDEX IF NOT EXISTS idx_tool_results_run_id ON tool_results(run_id);

CREATE TABLE IF NOT EXISTS turn_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turn_id INTEGER NOT NULL,
  run_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_turn_costs_turn_id ON turn_costs(turn_id);
CREATE INDEX IF NOT EXISTS idx_turn_costs_run_id ON turn_costs(run_id);
CREATE INDEX IF NOT EXISTS idx_turn_costs_agent ON turn_costs(agent);

CREATE TABLE IF NOT EXISTS agents (
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

CREATE TABLE IF NOT EXISTS costs (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  run_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd REAL,
  daily_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_costs_agent ON costs(agent);
CREATE INDEX IF NOT EXISTS idx_costs_daily_date ON costs(daily_date);

CREATE TABLE IF NOT EXISTS turn_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  turn_name TEXT,
  model TEXT,
  started_at DATETIME,
  finished_at DATETIME,
  duration_ms INTEGER,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  num_tool_calls INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- 'success', 'error', 'timeout', 'pending'
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
  UNIQUE(run_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_turn_details_run_id ON turn_details(run_id);
CREATE INDEX IF NOT EXISTS idx_turn_details_status ON turn_details(status);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rules_name ON rules(name);

CREATE TABLE IF NOT EXISTS turn_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turn_id INTEGER NOT NULL,
  rule_id TEXT NOT NULL,
  order_index INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
  UNIQUE(turn_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_turn_rules_turn_id ON turn_rules(turn_id);
CREATE INDEX IF NOT EXISTS idx_turn_rules_rule_id ON turn_rules(rule_id);

-- Agent Configs (ersetzt YAML komplett)
CREATE TABLE IF NOT EXISTS agent_configs (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT 1,
  model TEXT NOT NULL,
  schedule TEXT NOT NULL,
  system_prompt TEXT,
  max_tokens_per_turn INTEGER,
  max_steps INTEGER DEFAULT 5,
  budget_daily_tokens INTEGER,
  timeout_minutes INTEGER,
  config_json TEXT NOT NULL,  -- Full config as JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  turn_id INTEGER NOT NULL,
  turn_name TEXT NOT NULL,
  model TEXT,
  max_tokens INTEGER,
  max_steps INTEGER,
  mcps TEXT,  -- JSON array of MCP names
  tools TEXT,  -- JSON array of specific tool names (prefixed, e.g. "satbase_list-news")
  prompt TEXT,
  prompt_file TEXT,
  rules TEXT,  -- JSON array of rule IDs
  order_index INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_name) REFERENCES agent_configs(name) ON DELETE CASCADE,
  UNIQUE(agent_name, turn_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_turns_agent_name ON agent_turns(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_turns_order ON agent_turns(agent_name, order_index);

-- Insights (für Post-Run Knowledge Persistence)
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  run_id TEXT,
  insight TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  related_entities TEXT,  -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_name) REFERENCES agent_configs(name),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_insights_agent ON insights(agent_name);
CREATE INDEX IF NOT EXISTS idx_insights_run_id ON insights(run_id);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON insights(priority);

-- Agent Messages (für Agent-to-Agent Kommunikation)
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,  -- 'all' für Broadcast
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  related_entities TEXT,  -- JSON array
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON agent_messages(to_agent);
CREATE INDEX IF NOT EXISTS idx_messages_from_agent ON agent_messages(from_agent);
CREATE INDEX IF NOT EXISTS idx_messages_read ON agent_messages(read_at);

-- Run Context Cache
CREATE TABLE IF NOT EXISTS run_context_cache (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  run_id TEXT NOT NULL,
  context_summary TEXT NOT NULL,
  kg_entities TEXT,  -- JSON array
  manifold_thoughts TEXT,  -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_name) REFERENCES agent_configs(name),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_context_cache_agent ON run_context_cache(agent_name);
CREATE INDEX IF NOT EXISTS idx_context_cache_run_id ON run_context_cache(run_id);
