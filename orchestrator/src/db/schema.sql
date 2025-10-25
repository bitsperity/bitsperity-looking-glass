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
