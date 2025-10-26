from __future__ import annotations

import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, date, timedelta
from typing import Optional, Any, List
import json

from ..utils.logging import log


class MacroDB:
    """SQLite-based FRED macro data storage with WAL mode for high concurrency."""
    
    def __init__(self, db_path: Path):
        """Initialize database with schema if not exists."""
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        log("macrodb_init", path=str(db_path))
    
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
                CREATE TABLE IF NOT EXISTS macro_series (
                    series_id TEXT NOT NULL,
                    date DATE NOT NULL,
                    value REAL NOT NULL,
                    source TEXT DEFAULT 'fred',
                    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (series_id, date)
                );
                
                CREATE INDEX IF NOT EXISTS idx_series_date ON macro_series(series_id, date DESC);
                CREATE INDEX IF NOT EXISTS idx_date ON macro_series(date);
                
                CREATE TABLE IF NOT EXISTS macro_meta (
                    series_id TEXT PRIMARY KEY,
                    title TEXT,
                    units TEXT,
                    frequency TEXT,
                    observation_start DATE,
                    observation_end DATE,
                    latest_date DATE,
                    latest_value REAL,
                    source TEXT DEFAULT 'fred',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS macro_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    action TEXT NOT NULL,
                    series_id TEXT,
                    details TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_audit_ts ON macro_audit(ts DESC);
                CREATE INDEX IF NOT EXISTS idx_audit_series ON macro_audit(series_id);
            """)
            log("macrodb_schema_initialized")
    
    def upsert_series_points(self, series_id: str, points: List[dict], source: str = 'fred') -> int:
        """
        Upsert FRED observations for a series.
        
        Args:
            series_id: FRED series ID (e.g., 'GDP', 'UNRATE')
            points: List of {date: date, value: float}
            source: Data source (default: 'fred')
        
        Returns:
            Count of inserted/updated rows
        """
        if not points:
            return 0
        
        with self.conn() as conn:
            count = 0
            for point in points:
                conn.execute(
                    """INSERT OR REPLACE INTO macro_series (series_id, date, value, source, fetched_at)
                       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                    (series_id, point['date'], point['value'], source)
                )
                count += 1
            
            self._audit(conn, 'upsert_series', series_id, f'inserted {count} observations')
            return count
    
    def upsert_meta(self, series_id: str, meta: dict) -> None:
        """
        Upsert series metadata.
        
        Args:
            series_id: FRED series ID
            meta: {title, units, frequency, observation_start, observation_end, latest_date?, latest_value?}
        """
        with self.conn() as conn:
            # Get latest value from series if not provided
            latest_date = meta.get('latest_date')
            latest_value = meta.get('latest_value')
            
            if not latest_date:
                row = conn.execute(
                    "SELECT date, value FROM macro_series WHERE series_id = ? ORDER BY date DESC LIMIT 1",
                    (series_id,)
                ).fetchone()
                if row:
                    latest_date = row['date']
                    latest_value = row['value']
            
            conn.execute(
                """INSERT OR REPLACE INTO macro_meta 
                   (series_id, title, units, frequency, observation_start, observation_end, latest_date, latest_value, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (
                    series_id,
                    meta.get('title'),
                    meta.get('units'),
                    meta.get('frequency'),
                    meta.get('observation_start'),
                    meta.get('observation_end'),
                    latest_date,
                    latest_value
                )
            )
            self._audit(conn, 'upsert_meta', series_id, 'updated metadata')
    
    def query_series(self, series_id: str, from_date: Optional[date] = None, 
                     to_date: Optional[date] = None, limit: Optional[int] = None,
                     order: str = 'asc') -> List[dict]:
        """
        Query observations for a series.
        
        Args:
            series_id: FRED series ID
            from_date: Optional start date
            to_date: Optional end date
            limit: Optional result limit
            order: 'asc' or 'desc'
        
        Returns:
            List of {date: date, value: float, series_id: str}
        """
        with self.conn() as conn:
            query = "SELECT date, value, series_id FROM macro_series WHERE series_id = ?"
            params = [series_id]
            
            if from_date:
                query += " AND date >= ?"
                params.append(from_date)
            if to_date:
                query += " AND date <= ?"
                params.append(to_date)
            
            query += f" ORDER BY date {order.upper()}"
            
            if limit:
                query += f" LIMIT {limit}"
            
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]
    
    def get_status(self, series_id: str) -> dict:
        """Get status for a series."""
        with self.conn() as conn:
            meta = conn.execute(
                "SELECT * FROM macro_meta WHERE series_id = ?", (series_id,)
            ).fetchone()
            
            series_count = conn.execute(
                "SELECT COUNT(*) FROM macro_series WHERE series_id = ?", (series_id,)
            ).fetchone()[0]
            
            if not meta:
                return {
                    'series_id': series_id,
                    'observation_count': 0,
                    'latest_date': None,
                    'latest_value': None,
                    'title': None,
                    'units': None,
                    'frequency': None,
                    'observation_start': None,
                    'observation_end': None
                }
            
            return {
                'series_id': series_id,
                'observation_count': series_count,
                'latest_date': meta['latest_date'],
                'latest_value': meta['latest_value'],
                'title': meta['title'],
                'units': meta['units'],
                'frequency': meta['frequency'],
                'observation_start': meta['observation_start'],
                'observation_end': meta['observation_end']
            }
    
    def get_latest_date(self, series_id: str) -> Optional[date]:
        """Get latest observation date for a series."""
        with self.conn() as conn:
            row = conn.execute(
                "SELECT MAX(date) FROM macro_series WHERE series_id = ?", (series_id,)
            ).fetchone()
            return row[0] if row and row[0] else None
    
    def get_missing_days(self, series_id: str, from_date: date, to_date: date) -> List[date]:
        """Get missing dates in range (for daily series)."""
        with self.conn() as conn:
            rows = conn.execute(
                "SELECT DISTINCT date FROM macro_series WHERE series_id = ? AND date BETWEEN ? AND ? ORDER BY date",
                (series_id, from_date, to_date)
            ).fetchall()
            
            existing_dates = {row[0] for row in rows}
            
            # Check frequency to decide what's "missing"
            meta = conn.execute(
                "SELECT frequency FROM macro_meta WHERE series_id = ?", (series_id,)
            ).fetchone()
            
            if not meta or 'Daily' not in (meta[0] or ''):
                return []  # Not a daily series
            
            # Find missing business days
            current = from_date
            missing = []
            while current <= to_date:
                if current.weekday() < 5 and str(current) not in existing_dates:  # Monday-Friday
                    missing.append(current)
                current += timedelta(days=1)
            
            return missing
    
    def _audit(self, conn, action: str, series_id: str, details: str = '') -> None:
        """Log audit entry."""
        conn.execute(
            "INSERT INTO macro_audit (action, series_id, details) VALUES (?, ?, ?)",
            (action, series_id, details)
        )
    
    def get_audit_log(self, limit: int = 100) -> List[dict]:
        """Get recent audit log entries."""
        with self.conn() as conn:
            rows = conn.execute(
                "SELECT ts, action, series_id, details FROM macro_audit ORDER BY ts DESC LIMIT ?",
                (limit,)
            ).fetchall()
            return [dict(row) for row in rows]
