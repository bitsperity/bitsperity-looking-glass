from __future__ import annotations

import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, date, timedelta
from typing import Optional, Any, List
import json

from ..utils.logging import log


class PricesDB:
    """SQLite-based price data storage with WAL mode for high concurrency."""
    
    def __init__(self, db_path: Path):
        """Initialize database with schema if not exists."""
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        log("pricesdb_init", path=str(db_path))
    
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
                CREATE TABLE IF NOT EXISTS daily_bars (
                    ticker TEXT NOT NULL,
                    date DATE NOT NULL,
                    open REAL NOT NULL,
                    high REAL NOT NULL,
                    low REAL NOT NULL,
                    close REAL NOT NULL,
                    volume INTEGER NOT NULL,
                    source TEXT DEFAULT 'stooq',
                    PRIMARY KEY (ticker, date)
                );
                
                CREATE INDEX IF NOT EXISTS idx_ticker_date_desc ON daily_bars(ticker, date DESC);
                CREATE INDEX IF NOT EXISTS idx_date ON daily_bars(date);
                CREATE INDEX IF NOT EXISTS idx_source ON daily_bars(source);
                
                CREATE TABLE IF NOT EXISTS symbols_meta (
                    ticker TEXT PRIMARY KEY,
                    name TEXT,
                    exchange TEXT,
                    currency TEXT,
                    country TEXT,
                    sector TEXT,
                    industry TEXT,
                    source_pref TEXT DEFAULT 'stooq',
                    source_fail_count INTEGER DEFAULT 0,
                    info_json TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_exchange ON symbols_meta(exchange);
                CREATE INDEX IF NOT EXISTS idx_sector ON symbols_meta(sector);
                
                CREATE TABLE IF NOT EXISTS invalid_symbols (
                    ticker TEXT PRIMARY KEY,
                    reason TEXT,
                    last_failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS prices_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    action TEXT NOT NULL,
                    ticker TEXT,
                    details TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_audit_ts ON prices_audit(ts DESC);
                CREATE INDEX IF NOT EXISTS idx_audit_ticker ON prices_audit(ticker);
            """)
            log("pricesdb_schema_initialized")
    
    def upsert_daily_bars(self, ticker: str, bars: List[dict], source: str = 'stooq') -> int:
        """
        Upsert daily OHLCV bars.
        
        Args:
            ticker: Stock ticker
            bars: List of dicts with keys: date, open, high, low, close, volume
            source: Data source (stooq or yfinance)
        
        Returns:
            Count of upserted rows
        """
        if not bars:
            return 0
        
        with self.conn() as conn:
            # Insert or replace bars
            rows_inserted = 0
            for bar in bars:
                conn.execute("""
                    INSERT OR REPLACE INTO daily_bars
                    (ticker, date, open, high, low, close, volume, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ticker.upper(),
                    bar['date'],
                    bar['open'],
                    bar['high'],
                    bar['low'],
                    bar['close'],
                    bar['volume'],
                    source
                ))
                rows_inserted += 1
            
            # Update metadata if doesn't exist
            conn.execute("""
                INSERT OR IGNORE INTO symbols_meta (ticker, source_pref)
                VALUES (?, ?)
            """, (ticker.upper(), source))
            
            # Log audit
            self._audit(conn, 'upsert', ticker, f'inserted {rows_inserted} bars from {source}')
            
            return rows_inserted
    
    def get_latest_date(self, ticker: str) -> Optional[date]:
        """Get the latest date for a ticker."""
        with self.conn() as conn:
            row = conn.execute(
                "SELECT MAX(date) as max_date FROM daily_bars WHERE ticker = ?",
                (ticker.upper(),)
            ).fetchone()
            if row and row['max_date']:
                return date.fromisoformat(row['max_date'])
            return None
    
    def query_bars(
        self,
        ticker: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 10000
    ) -> List[dict]:
        """
        Query bars for a ticker within date range.
        
        Returns:
            List of dicts sorted by date descending
        """
        with self.conn() as conn:
            query = "SELECT * FROM daily_bars WHERE ticker = ?"
            params = [ticker.upper()]
            
            if from_date:
                query += " AND date >= ?"
                params.append(str(from_date))
            if to_date:
                query += " AND date <= ?"
                params.append(str(to_date))
            
            query += " ORDER BY date DESC LIMIT ?"
            params.append(limit)
            
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]
    
    def get_status(self, ticker: str) -> dict:
        """Get status for a ticker."""
        with self.conn() as conn:
            # Latest date
            latest = conn.execute(
                "SELECT MAX(date) as max_date FROM daily_bars WHERE ticker = ?",
                (ticker.upper(),)
            ).fetchone()
            latest_date = latest['max_date'] if latest and latest['max_date'] else None
            
            # Count bars
            count = conn.execute(
                "SELECT COUNT(*) as cnt FROM daily_bars WHERE ticker = ?",
                (ticker.upper(),)
            ).fetchone()
            bar_count = count['cnt'] if count else 0
            
            # Check if invalid
            invalid = conn.execute(
                "SELECT reason FROM invalid_symbols WHERE ticker = ?",
                (ticker.upper(),)
            ).fetchone()
            is_invalid = invalid is not None
            invalid_reason = invalid['reason'] if invalid else None
            
            # Get metadata
            meta = conn.execute(
                "SELECT source_pref, source_fail_count FROM symbols_meta WHERE ticker = ?",
                (ticker.upper(),)
            ).fetchone()
            source_pref = meta['source_pref'] if meta else 'stooq'
            fail_count = meta['source_fail_count'] if meta else 0
            
            return {
                'ticker': ticker.upper(),
                'latest_date': latest_date,
                'bar_count': bar_count,
                'invalid': is_invalid,
                'invalid_reason': invalid_reason,
                'source': source_pref,
                'source_fail_count': fail_count,
            }
    
    def mark_invalid(self, ticker: str, reason: str) -> None:
        """Mark a ticker as invalid."""
        with self.conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO invalid_symbols (ticker, reason, last_failed_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (ticker.upper(), reason))
            self._audit(conn, 'mark_invalid', ticker, reason)
    
    def unmark_invalid(self, ticker: str) -> None:
        """Unmark a ticker as invalid."""
        with self.conn() as conn:
            conn.execute("DELETE FROM invalid_symbols WHERE ticker = ?", (ticker.upper(),))
            self._audit(conn, 'unmark_invalid', ticker, 'ticker recovered')
    
    def update_source_pref(self, ticker: str, source: str, increment_fail: bool = False) -> None:
        """Update source preference and failure count."""
        with self.conn() as conn:
            if increment_fail:
                conn.execute("""
                    UPDATE symbols_meta
                    SET source_fail_count = source_fail_count + 1
                    WHERE ticker = ?
                """, (ticker.upper(),))
            else:
                conn.execute("""
                    UPDATE symbols_meta
                    SET source_pref = ?, source_fail_count = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE ticker = ?
                """, (source, ticker.upper()))
    
    def update_symbols_meta(self, ticker: str, name: str = None, exchange: str = None, 
                           currency: str = None, country: str = None, sector: str = None,
                           industry: str = None, info: dict = None) -> None:
        """Update symbol metadata."""
        with self.conn() as conn:
            info_json = json.dumps(info) if info else None
            
            conn.execute("""
                INSERT INTO symbols_meta
                (ticker, name, exchange, currency, country, sector, industry, info_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(ticker) DO UPDATE SET
                    name = COALESCE(?, name),
                    exchange = COALESCE(?, exchange),
                    currency = COALESCE(?, currency),
                    country = COALESCE(?, country),
                    sector = COALESCE(?, sector),
                    industry = COALESCE(?, industry),
                    info_json = COALESCE(?, info_json),
                    updated_at = CURRENT_TIMESTAMP
            """, (
                ticker.upper(), name, exchange, currency, country, sector, industry, info_json,
                name, exchange, currency, country, sector, industry, info_json
            ))
            self._audit(conn, 'update_meta', ticker, f'meta updated')
    
    def get_symbols_meta(self, ticker: str) -> Optional[dict]:
        """Get symbol metadata."""
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM symbols_meta WHERE ticker = ?",
                (ticker.upper(),)
            ).fetchone()
            if row:
                result = dict(row)
                if result.get('info_json'):
                    result['info'] = json.loads(result['info_json'])
                return result
            return None
    
    def get_missing_days(self, ticker: str, from_date: date, to_date: date) -> List[date]:
        """Get list of missing trading days in a range (simplified: assumes 250 trading days/year)."""
        with self.conn() as conn:
            rows = conn.execute("""
                SELECT date FROM daily_bars
                WHERE ticker = ? AND date >= ? AND date <= ?
                ORDER BY date
            """, (ticker.upper(), str(from_date), str(to_date))).fetchall()
            
            existing_dates = {date.fromisoformat(row['date']) for row in rows}
            
            # Generate all dates in range (excluding weekends)
            all_dates = set()
            current = from_date
            while current <= to_date:
                # Exclude weekends (5=Saturday, 6=Sunday)
                if current.weekday() < 5:
                    all_dates.add(current)
                current += timedelta(days=1)
            
            missing = sorted(all_dates - existing_dates)
            return missing
    
    def delete_bars(self, ticker: str, from_date: Optional[date] = None, 
                   to_date: Optional[date] = None) -> int:
        """Delete bars for a ticker."""
        with self.conn() as conn:
            query = "DELETE FROM daily_bars WHERE ticker = ?"
            params = [ticker.upper()]
            
            if from_date:
                query += " AND date >= ?"
                params.append(str(from_date))
            if to_date:
                query += " AND date <= ?"
                params.append(str(to_date))
            
            cursor = conn.execute(query, params)
            self._audit(conn, 'delete', ticker, f'deleted {cursor.rowcount} bars')
            return cursor.rowcount
    
    def _audit(self, conn: sqlite3.Connection, action: str, ticker: Optional[str], 
              details: str) -> None:
        """Log audit entry."""
        conn.execute("""
            INSERT INTO prices_audit (action, ticker, details)
            VALUES (?, ?, ?)
        """, (action, ticker, details))
