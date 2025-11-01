"""
Database client for Coalesence API - direct SQLite access.
Uses context manager pattern like Satbase to avoid database locks.
"""
from __future__ import annotations

import os
import json
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Any, Optional
from datetime import datetime


class CoalesenceDB:
    """Direct SQLite access for Coalesence API with context manager pattern."""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        # Ensure parent directory exists
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        # Initialize schema on first connection
        self._init_schema()
    
    @contextmanager
    def _conn(self):
        """Get database connection with proper settings (like Satbase pattern)."""
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
    
    def _init_schema(self):
        """Initialize database schema."""
        schema_path = Path(__file__).parent.parent.parent / "coalescence" / "src" / "db" / "schema.sql"
        if schema_path.exists():
            with open(schema_path, 'r') as f:
                schema = f.read()
        with self._conn() as conn:
            conn.executescript(schema)
    
    def save_agent_config(self, agent_name: str, config: dict[str, Any]) -> None:
        """Save agent config."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_configs (
                    name, enabled, model, schedule, system_prompt,
                    max_tokens_per_turn, max_steps, budget_daily_tokens,
                    timeout_minutes, config_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(name) DO UPDATE SET
                    enabled = excluded.enabled,
                    model = excluded.model,
                    schedule = excluded.schedule,
                    system_prompt = excluded.system_prompt,
                    max_tokens_per_turn = excluded.max_tokens_per_turn,
                    max_steps = excluded.max_steps,
                    budget_daily_tokens = excluded.budget_daily_tokens,
                    timeout_minutes = excluded.timeout_minutes,
                    config_json = excluded.config_json,
                    updated_at = datetime('now')
            """, (
                agent_name,
                config.get("enabled", True),
                config["model"],
                config["schedule"],
                config.get("system_prompt"),
                config.get("max_tokens_per_turn"),
                config.get("max_steps", 5),
                config["budget_daily_tokens"],
                config["timeout_minutes"],
                json.dumps(config)
            ))
    
    def get_agent_config(self, agent_name: str) -> Optional[dict[str, Any]]:
        """Get agent config."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agent_configs WHERE name = ?", (agent_name,))
            row = cursor.fetchone()
            if not row:
                return None
            
            # Load turns - explicitly select tools column to ensure it's included
            cursor.execute("""
                SELECT turn_id, turn_name, model, max_tokens, max_steps, mcps, tools, prompt, prompt_file, rules
                FROM agent_turns 
                WHERE agent_name = ? 
                ORDER BY order_index ASC
            """, (agent_name,))
            turns_rows = cursor.fetchall()
            
            turns = []
            for t in turns_rows:
                # Handle missing 'tools' column gracefully
                tools_value = []
                try:
                    # Direct access - sqlite3.Row supports dict-style access
                    # Check if column exists first
                    if "tools" in t.keys():
                        tools_str = t["tools"]
                        if tools_str is not None and tools_str != "":
                            tools_value = json.loads(tools_str)
                except (KeyError, json.JSONDecodeError, TypeError) as e:
                    # Default to empty array on any error
                    tools_value = []
                
                turn_dict = {
                    "id": t["turn_id"],
                    "name": t["turn_name"],
                    "model": t["model"],
                    "max_tokens": t["max_tokens"],
                    "max_steps": t["max_steps"],
                    "mcps": json.loads(t["mcps"]) if t["mcps"] else [],
                    "tools": tools_value,  # Always return array, never None
                    "prompt": t["prompt"],
                    "prompt_file": t["prompt_file"],
                    "rules": json.loads(t["rules"]) if t["rules"] else []
                }
                turns.append(turn_dict)
            
            return {
                "name": agent_name,  # Use 'name' for consistency with frontend
                "agent": agent_name,  # Keep 'agent' for backwards compatibility
                "enabled": bool(row["enabled"]),
                "model": row["model"],
                "schedule": row["schedule"],
                "system_prompt": row["system_prompt"],
                "max_tokens_per_turn": row["max_tokens_per_turn"],
                "max_steps": row["max_steps"],
                "budget_daily_tokens": row["budget_daily_tokens"],
                "timeout_minutes": row["timeout_minutes"],
                "turns": turns,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            }
    
    def list_agent_configs(self) -> list[dict[str, Any]]:
        """List all agent configs."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    ac.*,
                    a.last_run_at,
                    a.last_run_id,
                    a.total_runs,
                    a.total_tokens,
                    a.total_cost_usd
                FROM agent_configs ac
                LEFT JOIN agents a ON ac.name = a.name
                ORDER BY ac.created_at DESC
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def update_agent_config(self, agent_name: str, updates: dict[str, Any]) -> None:
        """Update agent config."""
        # Allowed fields for updates
        allowed_fields = {
            "enabled": "enabled",
            "model": "model",
            "schedule": "schedule",
            "system_prompt": "system_prompt",
            "max_tokens_per_turn": "max_tokens_per_turn",
            "max_steps": "max_steps",
            "budget_daily_tokens": "budget_daily_tokens",
            "timeout_minutes": "timeout_minutes"
        }
        
        fields = ["updated_at = datetime('now')"]
        values = []
        
        for key, value in updates.items():
            if key == "turns":
                continue  # Handle separately
            if key in allowed_fields and value is not None:
                fields.append(f"{allowed_fields[key]} = ?")
                values.append(value)
        
        if len(fields) == 1:
            return
        
        values.append(agent_name)
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE agent_configs SET {', '.join(fields)} WHERE name = ?", values)
    
    def delete_agent_config(self, agent_name: str) -> None:
        """Delete agent config."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM agent_configs WHERE name = ?", (agent_name,))
    
    def save_agent_turns(self, agent_name: str, turns: list[dict[str, Any]]) -> None:
        """Save agent turns."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM agent_turns WHERE agent_name = ?", (agent_name,))
            
            for index, turn in enumerate(turns):
                # Convert Pydantic model to dict if needed
                if hasattr(turn, 'model_dump'):
                    turn = turn.model_dump()
                elif not isinstance(turn, dict):
                    turn = dict(turn)
                
                # Ensure tools is always a list
                tools_value = turn.get("tools")
                if tools_value is None:
                    tools_value = []
                elif not isinstance(tools_value, list):
                    tools_value = []
                
                # Use turn.id if present and valid, otherwise use index (0-based)
                turn_id = turn.get("id")
                if turn_id is None:
                    turn_id = index  # 0-based IDs: 0, 1, 2, ...
                
                cursor.execute("""
                    INSERT INTO agent_turns (
                        agent_name, turn_id, turn_name, model, max_tokens, max_steps,
                        mcps, tools, prompt, prompt_file, rules, order_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    agent_name,
                    turn_id,
                    turn.get("name", f"turn-{index + 1}"),
                    turn.get("model"),
                    turn.get("max_tokens"),
                    turn.get("max_steps"),
                    json.dumps(turn.get("mcps", []) or []),
                    json.dumps(tools_value),  # Always JSON encode, never None
                    turn.get("prompt"),
                    turn.get("prompt_file"),
                    json.dumps(turn.get("rules", [])),
                    index
                ))
    
    def save_insight(self, insight_id: str, agent_name: str, insight: str, 
                     priority: str = "medium", run_id: Optional[str] = None,
                     related_entities: Optional[list[str]] = None) -> None:
        """Save insight."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights (id, agent_name, run_id, insight, priority, related_entities)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                insight_id,
                agent_name,
                run_id,
                insight,
                priority,
                json.dumps(related_entities) if related_entities else None
            ))
    
    def get_insights(self, agent_name: str, days_back: int = 7) -> list[dict[str, Any]]:
        """Get insights."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM insights
                WHERE agent_name = ? AND created_at >= datetime('now', '-' || ? || ' days')
                ORDER BY created_at DESC
            """, (agent_name, days_back))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def save_message(self, message_id: str, from_agent: str, to_agent: str,
                     msg_type: str, content: str, related_entities: Optional[list[str]] = None) -> None:
        """Save message."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_messages (id, from_agent, to_agent, type, content, related_entities)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                message_id,
                from_agent,
                to_agent,
                msg_type,
                content,
                json.dumps(related_entities) if related_entities else None
            ))
    
    def get_messages(self, agent_name: str, unread_only: bool = True,
                     from_agent: Optional[str] = None) -> list[dict[str, Any]]:
        """Get messages."""
        query = """
            SELECT * FROM agent_messages
            WHERE (to_agent = ? OR to_agent = 'all')
        """
        params = [agent_name]
        
        if unread_only:
            query += " AND read_at IS NULL"
        if from_agent:
            query += " AND from_agent = ?"
            params.append(from_agent)
        
        query += " ORDER BY created_at DESC"
        
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def mark_message_read(self, message_id: str) -> None:
        """Mark message as read."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE agent_messages SET read_at = datetime('now') WHERE id = ?", (message_id,))
    
    def save_run_context(self, context_id: str, agent_name: str, run_id: str,
                         context_summary: str, kg_entities: Optional[list] = None,
                         manifold_thoughts: Optional[list] = None) -> None:
        """Save run context."""
        with self._conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO run_context_cache (id, agent_name, run_id, context_summary, kg_entities, manifold_thoughts)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                context_id,
                agent_name,
                run_id,
                context_summary,
                json.dumps(kg_entities) if kg_entities else None,
                json.dumps(manifold_thoughts) if manifold_thoughts else None
            ))
    
    def get_run_context(self, agent_name: str, days_back: int = 7) -> dict[str, Any]:
        """Get run context."""
        with self._conn() as conn:
            cursor = conn.cursor()
            
            # Get recent runs
            cursor.execute("""
                SELECT * FROM runs
                WHERE agent = ? AND created_at >= datetime('now', '-' || ? || ' days')
                ORDER BY created_at DESC
                LIMIT 10
            """, (agent_name, days_back))
            runs = [dict(row) for row in cursor.fetchall()]
        
        # Get recent insights (this method uses its own connection)
        insights = self.get_insights(agent_name, days_back)
        
        # Get recent messages (this method uses its own connection)
        messages = self.get_messages(agent_name, unread_only=False)
        
        summary = f"Recent runs: {len(runs)}, Insights: {len(insights)}, Messages: {len(messages)}"
        
        return {
            "summary": summary,
            "runs": runs[:5],
            "insights": insights[:10],
            "messages": messages[:10]
        }

