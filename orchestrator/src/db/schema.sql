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
  error_message TEXT,
  chat_file TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs(agent);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

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
