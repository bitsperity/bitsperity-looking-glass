from __future__ import annotations

import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, date, timedelta
from typing import Optional, Any, Literal
import json

from ..utils.logging import log


class WatchlistDB:
    """SQLite-based watchlist storage with unified model for stocks, topics, macro."""
    
    def __init__(self, db_path: Path):
        """Initialize database with schema if not exists."""
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        log("watchlistdb_init", path=str(db_path))
    
    @contextmanager
    def conn(self):
        """Get database connection with proper settings."""
        conn = sqlite3.connect(str(self.db_path), timeout=120.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=-64000")
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
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL CHECK(type IN ('stock', 'topic', 'macro')),
                    key TEXT NOT NULL,
                    label TEXT,
                    enabled BOOLEAN NOT NULL DEFAULT 1,
                    auto_ingest BOOLEAN NOT NULL DEFAULT 1,
                    active_from TIMESTAMP,
                    active_to TIMESTAMP,
                    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATE,
                    last_refresh_at TIMESTAMP,
                    metadata TEXT,
                    deleted BOOLEAN NOT NULL DEFAULT 0,
                    UNIQUE(type, key)
                );
                
                CREATE INDEX IF NOT EXISTS idx_watchlist_enabled ON watchlist_items(enabled);
                CREATE INDEX IF NOT EXISTS idx_watchlist_expires_at ON watchlist_items(expires_at);
                CREATE INDEX IF NOT EXISTS idx_watchlist_active_window ON watchlist_items(active_from, active_to);
                CREATE INDEX IF NOT EXISTS idx_watchlist_deleted ON watchlist_items(deleted);
                CREATE INDEX IF NOT EXISTS idx_watchlist_type_key ON watchlist_items(type, key);
                
                CREATE TABLE IF NOT EXISTS watchlist_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    action TEXT NOT NULL,
                    item_id INTEGER NOT NULL,
                    details TEXT,
                    FOREIGN KEY (item_id) REFERENCES watchlist_items(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_watchlist_audit_ts ON watchlist_audit(ts DESC);
                CREATE INDEX IF NOT EXISTS idx_watchlist_audit_action ON watchlist_audit(action);
                CREATE INDEX IF NOT EXISTS idx_watchlist_audit_item ON watchlist_audit(item_id);
            """)
    
    def _is_active_now(self, item: dict) -> bool:
        """Check if item is active right now."""
        if not item.get('enabled') or item.get('deleted'):
            return False
        
        now = datetime.utcnow()
        today = date.today()
        
        # Check expiry
        expires_at = item.get('expires_at')
        if expires_at:
            try:
                if isinstance(expires_at, str):
                    exp_date = date.fromisoformat(expires_at)
                else:
                    exp_date = expires_at
                if today > exp_date:
                    return False
            except Exception:
                pass
        
        # Check time window
        active_from = item.get('active_from')
        active_to = item.get('active_to')
        
        if active_from:
            try:
                if isinstance(active_from, str):
                    af = datetime.fromisoformat(active_from)
                else:
                    af = active_from
                if now < af:
                    return False
            except Exception:
                pass
        
        if active_to:
            try:
                if isinstance(active_to, str):
                    at = datetime.fromisoformat(active_to)
                else:
                    at = active_to
                if now >= at:
                    return False
            except Exception:
                pass
        
        return True
    
    def add_items(self, items: list[dict]) -> list[dict]:
        """Add watchlist items (stocks/topics/macro)."""
        added = []
        
        with self.conn() as conn:
            for item in items:
                item_type = item.get('type')
                key = item.get('key')
                if not item_type or not key:
                    continue
                
                label = item.get('label')
                enabled = bool(item.get('enabled', True))
                auto_ingest = bool(item.get('auto_ingest', True))
                active_from = item.get('active_from')
                active_to = item.get('active_to')
                metadata = item.get('metadata')
                
                # Compute expires_at from ttl_days if provided
                expires_at = item.get('expires_at')
                if not expires_at and item.get('ttl_days'):
                    ttl = int(item['ttl_days'])
                    expires_at = (date.today() + timedelta(days=ttl)).isoformat()
                
                metadata_json = json.dumps(metadata) if metadata else None
                
                try:
                    cursor = conn.execute("""
                        INSERT OR REPLACE INTO watchlist_items
                        (type, key, label, enabled, auto_ingest, active_from, active_to, expires_at, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item_type, key, label, 1 if enabled else 0, 1 if auto_ingest else 0,
                        active_from, active_to, expires_at, metadata_json
                    ))
                    
                    item_id = cursor.lastrowid
                    
                    # Audit
                    conn.execute("""
                        INSERT INTO watchlist_audit (item_id, action, details)
                        VALUES (?, ?, ?)
                    """, (item_id, 'added', json.dumps({'type': item_type, 'key': key})))
                    
                    added.append({
                        'id': item_id,
                        'type': item_type,
                        'key': key,
                        'label': label,
                        'enabled': enabled,
                        'auto_ingest': auto_ingest,
                        'expires_at': expires_at
                    })
                except sqlite3.IntegrityError:
                    # Already exists, skip
                    pass
        
        return added
    
    def update_item(self, item_id: int, updates: dict) -> bool:
        """Update a watchlist item (partial update)."""
        if not updates:
            return False
        
        # Special rule: if enabling and no time window specified, clear windows
        if updates.get('enabled') is True:
            if 'active_from' not in updates and 'active_to' not in updates:
                updates['active_from'] = None
                updates['active_to'] = None
        
        # Build SQL
        set_parts = []
        params = []
        
        for key in ['enabled', 'auto_ingest', 'active_from', 'active_to', 'label']:
            if key in updates:
                val = updates[key]
                if key in ['enabled', 'auto_ingest']:
                    val = 1 if val else 0
                set_parts.append(f"{key} = ?")
                params.append(val)
        
        if 'ttl_days' in updates:
            ttl = int(updates['ttl_days'])
            expires_at = (date.today() + timedelta(days=ttl)).isoformat()
            set_parts.append("expires_at = ?")
            params.append(expires_at)
        elif 'expires_at' in updates:
            set_parts.append("expires_at = ?")
            params.append(updates['expires_at'])
        
        if 'metadata' in updates:
            metadata_json = json.dumps(updates['metadata']) if updates['metadata'] else None
            set_parts.append("metadata = ?")
            params.append(metadata_json)
        
        if not set_parts:
            return False
        
        params.append(item_id)
        sql = f"UPDATE watchlist_items SET {', '.join(set_parts)} WHERE id = ?"
        
        with self.conn() as conn:
            cursor = conn.execute(sql, params)
            if cursor.rowcount > 0:
                conn.execute("""
                    INSERT INTO watchlist_audit (item_id, action, details)
                    VALUES (?, ?, ?)
                """, (item_id, 'updated', json.dumps(updates)))
                return True
        
        return False
    
    def delete_item(self, item_id: int) -> bool:
        """Soft delete a watchlist item."""
        with self.conn() as conn:
            cursor = conn.execute("UPDATE watchlist_items SET deleted = 1 WHERE id = ?", (item_id,))
            if cursor.rowcount > 0:
                conn.execute("""
                    INSERT INTO watchlist_audit (item_id, action)
                    VALUES (?, ?)
                """, (item_id, 'deleted'))
                return True
        return False
    
    def list_items(self, 
                  item_type: str | None = None,
                  enabled: bool | None = None,
                  active_now: bool = False,
                  include_expired: bool = False,
                  search: str | None = None) -> list[dict]:
        """List watchlist items with optional filters."""
        where_parts = ["deleted = 0"]
        params = []
        
        if item_type:
            where_parts.append("type = ?")
            params.append(item_type)
        
        if enabled is not None:
            where_parts.append("enabled = ?")
            params.append(1 if enabled else 0)
        
        if not include_expired:
            where_parts.append("(expires_at IS NULL OR expires_at >= ?)")
            params.append(date.today().isoformat())
        
        if search:
            where_parts.append("(key LIKE ? OR label LIKE ?)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term])
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            cursor = conn.execute(f"""
                SELECT * FROM watchlist_items WHERE {where_clause}
                ORDER BY type, key
            """, params)
            
            items = [dict(row) for row in cursor.fetchall()]
        
        # Filter by active_now if requested
        if active_now:
            items = [item for item in items if self._is_active_now(item)]
        
        return items
    
    def get_active_items(self) -> list[dict]:
        """Get all currently active items (for scheduler)."""
        return self.list_items(active_now=True)
    
    def get_items_by_type(self, item_type: Literal['stock', 'topic', 'macro'], 
                          only_active: bool = True) -> list[str]:
        """Get keys of items by type (for scheduler/ingestion)."""
        items = self.list_items(item_type=item_type, active_now=only_active)
        return [item['key'] for item in items]
    
    def update_refresh_time(self, item_id: int) -> bool:
        """Update last_refresh_at timestamp."""
        with self.conn() as conn:
            cursor = conn.execute(
                "UPDATE watchlist_items SET last_refresh_at = CURRENT_TIMESTAMP WHERE id = ?",
                (item_id,)
            )
            return cursor.rowcount > 0
