from __future__ import annotations

import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, date, timedelta
from typing import Optional, Any, List, Dict
import json

from ..utils.logging import log


class SchedulerDB:
    """SQLite-based scheduler state management with WAL mode for high concurrency."""
    
    def __init__(self, db_path: Path):
        """Initialize database with schema if not exists."""
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        log("schedulerdb_init", path=str(db_path))
    
    @contextmanager
    def conn(self):
        """Get database connection with proper settings."""
        conn = sqlite3.connect(str(self.db_path), timeout=120.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=-64000")  # 64MB cache
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _init_schema(self) -> None:
        """Create schema if not exists."""
        with self.conn() as conn:
            conn.executescript("""
                -- Job configuration and state
                CREATE TABLE IF NOT EXISTS scheduler_jobs (
                    job_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    enabled BOOLEAN DEFAULT 1,
                    trigger_type TEXT NOT NULL,  -- 'cron', 'interval', 'date'
                    trigger_config TEXT NOT NULL,  -- JSON config
                    job_func TEXT NOT NULL,  -- Module path to function
                    max_instances INTEGER DEFAULT 1,
                    next_run_time TIMESTAMP,
                    last_run_time TIMESTAMP,
                    last_run_status TEXT,  -- 'success', 'error', 'running'
                    last_run_duration_ms INTEGER,
                    last_error TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_jobs_enabled ON scheduler_jobs(enabled);
                CREATE INDEX IF NOT EXISTS idx_jobs_next_run ON scheduler_jobs(next_run_time);
                
                -- Execution history
                CREATE TABLE IF NOT EXISTS scheduler_executions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL,
                    started_at TIMESTAMP NOT NULL,
                    finished_at TIMESTAMP,
                    status TEXT NOT NULL,  -- 'success', 'error', 'cancelled'
                    duration_ms INTEGER,
                    error_message TEXT,
                    result_summary TEXT,  -- JSON summary of job results
                    FOREIGN KEY (job_id) REFERENCES scheduler_jobs(job_id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_executions_job ON scheduler_executions(job_id);
                CREATE INDEX IF NOT EXISTS idx_executions_started ON scheduler_executions(started_at DESC);
                CREATE INDEX IF NOT EXISTS idx_executions_status ON scheduler_executions(status);
                
                -- Gap detection results (for backfill prioritization)
                CREATE TABLE IF NOT EXISTS scheduler_gaps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    gap_type TEXT NOT NULL,  -- 'news', 'prices', 'macro'
                    ticker TEXT,  -- For prices/macro
                    series_id TEXT,  -- For macro
                    from_date DATE NOT NULL,
                    to_date DATE NOT NULL,
                    severity TEXT NOT NULL,  -- 'critical', 'high', 'medium', 'low'
                    priority INTEGER DEFAULT 0,  -- Higher = more important
                    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    filled_at TIMESTAMP,
                    fill_job_id TEXT,
                    FOREIGN KEY (fill_job_id) REFERENCES scheduler_executions(id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_gaps_type ON scheduler_gaps(gap_type);
                CREATE INDEX IF NOT EXISTS idx_gaps_severity ON scheduler_gaps(severity);
                CREATE INDEX IF NOT EXISTS idx_gaps_priority ON scheduler_gaps(priority DESC);
                CREATE INDEX IF NOT EXISTS idx_gaps_filled ON scheduler_gaps(filled_at);
                
                -- Scheduler configuration
                CREATE TABLE IF NOT EXISTS scheduler_config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,  -- JSON value
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            log("schedulerdb_schema_initialized")
    
    # Job Management
    def upsert_job(
        self,
        job_id: str,
        name: str,
        trigger_type: str,
        trigger_config: Dict[str, Any],
        job_func: str,
        enabled: bool = True,
        max_instances: int = 1
    ) -> None:
        """Upsert a job configuration."""
        with self.conn() as conn:
            conn.execute("""
                INSERT INTO scheduler_jobs (
                    job_id, name, enabled, trigger_type, trigger_config,
                    job_func, max_instances, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(job_id) DO UPDATE SET
                    name = excluded.name,
                    enabled = excluded.enabled,
                    trigger_type = excluded.trigger_type,
                    trigger_config = excluded.trigger_config,
                    job_func = excluded.job_func,
                    max_instances = excluded.max_instances,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                job_id, name, enabled, trigger_type,
                json.dumps(trigger_config), job_func, max_instances
            ))
    
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get a job configuration."""
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM scheduler_jobs WHERE job_id = ?",
                (job_id,)
            ).fetchone()
            if not row:
                return None
            job = dict(row)
            job['trigger_config'] = json.loads(job['trigger_config'])
            return job
    
    def list_jobs(self, enabled_only: bool = False) -> List[Dict[str, Any]]:
        """List all jobs."""
        with self.conn() as conn:
            query = "SELECT * FROM scheduler_jobs"
            params = []
            if enabled_only:
                query += " WHERE enabled = 1"
            query += " ORDER BY name"
            
            rows = conn.execute(query, params).fetchall()
            jobs = []
            for row in rows:
                job = dict(row)
                job['trigger_config'] = json.loads(job['trigger_config'])
                jobs.append(job)
            return jobs
    
    def update_job_enabled(self, job_id: str, enabled: bool) -> bool:
        """Enable or disable a job."""
        with self.conn() as conn:
            cursor = conn.execute(
                "UPDATE scheduler_jobs SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?",
                (enabled, job_id)
            )
            return cursor.rowcount > 0
    
    def update_job_next_run(self, job_id: str, next_run_time: Optional[datetime]) -> None:
        """Update next run time for a job."""
        with self.conn() as conn:
            conn.execute(
                "UPDATE scheduler_jobs SET next_run_time = ? WHERE job_id = ?",
                (next_run_time, job_id)
            )
    
    def update_job_last_run(
        self,
        job_id: str,
        status: str,
        duration_ms: Optional[int] = None,
        error: Optional[str] = None
    ) -> None:
        """Update last run information for a job."""
        with self.conn() as conn:
            conn.execute("""
                UPDATE scheduler_jobs SET
                    last_run_time = CURRENT_TIMESTAMP,
                    last_run_status = ?,
                    last_run_duration_ms = ?,
                    last_error = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE job_id = ?
            """, (status, duration_ms, error, job_id))
    
    # Execution History
    def create_execution(
        self,
        job_id: str,
        started_at: Optional[datetime] = None
    ) -> int:
        """Create a new execution record and return its ID."""
        if started_at is None:
            started_at = datetime.utcnow()
        
        with self.conn() as conn:
            cursor = conn.execute("""
                INSERT INTO scheduler_executions (job_id, started_at, status)
                VALUES (?, ?, 'running')
            """, (job_id, started_at))
            return cursor.lastrowid
    
    def complete_execution(
        self,
        execution_id: int,
        status: str,
        duration_ms: Optional[int] = None,
        error_message: Optional[str] = None,
        result_summary: Optional[Dict[str, Any]] = None
    ) -> None:
        """Complete an execution record."""
        with self.conn() as conn:
            conn.execute("""
                UPDATE scheduler_executions SET
                    finished_at = CURRENT_TIMESTAMP,
                    status = ?,
                    duration_ms = ?,
                    error_message = ?,
                    result_summary = ?
                WHERE id = ?
            """, (
                status,
                duration_ms,
                error_message,
                json.dumps(result_summary) if result_summary else None,
                execution_id
            ))
    
    def get_executions(
        self,
        job_id: Optional[str] = None,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get execution history."""
        with self.conn() as conn:
            query = "SELECT * FROM scheduler_executions WHERE 1=1"
            params = []
            
            if job_id:
                query += " AND job_id = ?"
                params.append(job_id)
            
            if status:
                query += " AND status = ?"
                params.append(status)
            
            query += " ORDER BY started_at DESC LIMIT ?"
            params.append(limit)
            
            rows = conn.execute(query, params).fetchall()
            executions = []
            for row in rows:
                exec_dict = dict(row)
                if exec_dict.get('result_summary'):
                    exec_dict['result_summary'] = json.loads(exec_dict['result_summary'])
                executions.append(exec_dict)
            return executions
    
    # Gap Management
    def store_gap(
        self,
        gap_type: str,
        from_date: date,
        to_date: date,
        severity: str,
        priority: int = 0,
        ticker: Optional[str] = None,
        series_id: Optional[str] = None
    ) -> int:
        """Store a detected gap."""
        with self.conn() as conn:
            cursor = conn.execute("""
                INSERT INTO scheduler_gaps (
                    gap_type, ticker, series_id, from_date, to_date,
                    severity, priority
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (gap_type, ticker, series_id, from_date, to_date, severity, priority))
            return cursor.lastrowid
    
    def get_unfilled_gaps(
        self,
        gap_type: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get unfilled gaps, ordered by priority."""
        with self.conn() as conn:
            query = """
                SELECT * FROM scheduler_gaps
                WHERE filled_at IS NULL
            """
            params = []
            
            if gap_type:
                query += " AND gap_type = ?"
                params.append(gap_type)
            
            if severity:
                query += " AND severity = ?"
                params.append(severity)
            
            query += " ORDER BY priority DESC, detected_at ASC LIMIT ?"
            params.append(limit)
            
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]
    
    def mark_gap_filled(self, gap_id: int, fill_job_id: Optional[int] = None) -> None:
        """Mark a gap as filled."""
        with self.conn() as conn:
            conn.execute("""
                UPDATE scheduler_gaps SET
                    filled_at = CURRENT_TIMESTAMP,
                    fill_job_id = ?
                WHERE id = ?
            """, (fill_job_id, gap_id))
    
    # Configuration
    def set_config(self, key: str, value: Any) -> None:
        """Set a configuration value."""
        with self.conn() as conn:
            conn.execute("""
                INSERT INTO scheduler_config (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP
            """, (key, json.dumps(value)))
    
    def get_config(self, key: str, default: Any = None) -> Any:
        """Get a configuration value."""
        with self.conn() as conn:
            row = conn.execute(
                "SELECT value FROM scheduler_config WHERE key = ?",
                (key,)
            ).fetchone()
            if not row:
                return default
            return json.loads(row['value'])

