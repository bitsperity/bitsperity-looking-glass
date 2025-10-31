import sqlite3
from pathlib import Path
from datetime import datetime, timezone
import json
import hashlib
from typing import Optional, List

class TesseractDB:
    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
    
    def _init_schema(self):
        """Initialize SQLite schema on startup"""
        with self.conn() as conn:
            # Table: embedded_articles (tracking which articles are embedded)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS embedded_articles (
                    news_id TEXT PRIMARY KEY,
                    published_at TEXT,
                    updated_at TEXT,
                    content_hash TEXT NOT NULL,
                    embedded_at INTEGER NOT NULL
                )
            """)
            
            # Indexes for embedded_articles
            conn.execute("CREATE INDEX IF NOT EXISTS idx_embedded_at ON embedded_articles(embedded_at)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_published_at ON embedded_articles(published_at)")
            
            # Table: embed_jobs (job tracking)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS embed_jobs (
                    job_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    started_at INTEGER,
                    completed_at INTEGER,
                    processed INTEGER DEFAULT 0,
                    total INTEGER DEFAULT 0,
                    error TEXT,
                    params TEXT
                )
            """)
            
            # Indexes for embed_jobs
            conn.execute("CREATE INDEX IF NOT EXISTS idx_job_status ON embed_jobs(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_job_started_at ON embed_jobs(started_at)")
            
            # Table: search_history (tracking semantic searches)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS search_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query TEXT NOT NULL,
                    filters TEXT,
                    result_count INTEGER,
                    created_at INTEGER NOT NULL
                )
            """)
            
            # Indexes for search_history
            conn.execute("CREATE INDEX IF NOT EXISTS idx_search_created_at ON search_history(created_at)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_search_query ON search_history(query)")
            
            conn.commit()
    
    def conn(self):
        """Get database connection"""
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """Reinitialize database schema"""
        self._init_schema()
    
    def drop_all_tables(self):
        """Drop all tables (for factory reset)"""
        with self.conn() as conn:
            conn.execute("DROP TABLE IF EXISTS embedded_articles")
            conn.execute("DROP TABLE IF EXISTS embed_jobs")
            conn.execute("DROP TABLE IF EXISTS search_history")
            conn.commit()
    
    @staticmethod
    def compute_content_hash(title: str, body_text: str) -> str:
        """Compute hash of title + body for change detection"""
        content = f"{title}||{body_text}".encode('utf-8')
        return hashlib.sha256(content).hexdigest()
    
    def article_needs_embedding(self, news_id: str, title: str, body_text: str) -> bool:
        """Check if article needs (re)embedding based on content hash"""
        content_hash = self.compute_content_hash(title, body_text)
        
        with self.conn() as conn:
            row = conn.execute(
                "SELECT content_hash FROM embedded_articles WHERE news_id = ?",
                (news_id,)
            ).fetchone()
            
            if row is None:
                return True  # Not embedded yet
            
            return row[0] != content_hash  # Hash mismatch = needs re-embedding
    
    def mark_article_embedded(self, news_id: str, published_at: str, title: str, body_text: str):
        """Mark article as embedded with content hash"""
        content_hash = self.compute_content_hash(title, body_text)
        now = int(datetime.now(timezone.utc).timestamp())
        
        with self.conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO embedded_articles 
                (news_id, published_at, updated_at, content_hash, embedded_at)
                VALUES (?, ?, ?, ?, ?)
            """, (news_id, published_at, published_at, content_hash, now))
            conn.commit()
    
    def create_job(self, job_id: str, params: dict) -> None:
        """Create new embedding job"""
        now = int(datetime.now(timezone.utc).timestamp())
        params_json = json.dumps(params)
        
        with self.conn() as conn:
            conn.execute("""
                INSERT INTO embed_jobs (job_id, status, started_at, params, processed, total)
                VALUES (?, 'created', ?, ?, 0, 0)
            """, (job_id, now, params_json))
            conn.commit()
    
    def update_job_status(self, job_id: str, status: str, processed: int = None, total: int = None):
        """Update job status and progress"""
        updates = ["status = ?"]
        values = [status]
        
        if processed is not None:
            updates.append("processed = ?")
            values.append(processed)
        
        if total is not None:
            updates.append("total = ?")
            values.append(total)
        
        values.append(job_id)
        
        with self.conn() as conn:
            conn.execute(f"UPDATE embed_jobs SET {', '.join(updates)} WHERE job_id = ?", values)
            conn.commit()
    
    def complete_job(self, job_id: str, error: str = None):
        """Mark job as complete"""
        now = int(datetime.now(timezone.utc).timestamp())
        status = "error" if error else "done"
        
        with self.conn() as conn:
            conn.execute("""
                UPDATE embed_jobs 
                SET status = ?, completed_at = ?, error = ?
                WHERE job_id = ?
            """, (status, now, error, job_id))
            conn.commit()
    
    def get_job(self, job_id: str) -> Optional[dict]:
        """Get job by ID"""
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM embed_jobs WHERE job_id = ?",
                (job_id,)
            ).fetchone()
            
            if row is None:
                return None
            
            result = dict(row)
            if result.get('params'):
                result['params'] = json.loads(result['params'])
            return result
    
    def list_jobs(self, limit: int = 100, status_filter: str = None) -> List[dict]:
        """List recent jobs"""
        query = "SELECT * FROM embed_jobs"
        params = []
        
        if status_filter:
            query += " WHERE status = ?"
            params.append(status_filter)
        
        query += " ORDER BY started_at DESC LIMIT ?"
        params.append(limit)
        
        with self.conn() as conn:
            rows = conn.execute(query, params).fetchall()
            
            result = []
            for row in rows:
                data = dict(row)
                if data.get('params'):
                    data['params'] = json.loads(data['params'])
                result.append(data)
            
            return result
    
    def get_embedded_count(self) -> int:
        """Get total count of embedded articles"""
        with self.conn() as conn:
            row = conn.execute("SELECT COUNT(*) FROM embedded_articles").fetchone()
            return row[0] if row else 0
    
    def get_articles_needing_embedding(self, articles: List[dict]) -> List[dict]:
        """Filter articles that need embedding (by content hash)"""
        needing_embed = []
        
        for article in articles:
            if self.article_needs_embedding(
                article['id'],
                article.get('title', ''),
                article.get('body_text', '')
            ):
                needing_embed.append(article)
        
        return needing_embed
    
    def log_search(self, query: str, filters: dict = None, result_count: int = 0):
        """Log a semantic search query"""
        now = int(datetime.now(timezone.utc).timestamp())
        filters_json = json.dumps(filters) if filters else None
        
        with self.conn() as conn:
            conn.execute("""
                INSERT INTO search_history (query, filters, result_count, created_at)
                VALUES (?, ?, ?, ?)
            """, (query, filters_json, result_count, now))
            conn.commit()
    
    def get_search_history(
        self, 
        limit: int = 50, 
        query_filter: str = None,
        days: int = None
    ) -> List[dict]:
        """Get search history with optional filters"""
        conditions = []
        params = []
        
        if query_filter:
            conditions.append("query LIKE ?")
            params.append(f"%{query_filter}%")
        
        if days:
            cutoff = int(datetime.now(timezone.utc).timestamp()) - (days * 86400)
            conditions.append("created_at >= ?")
            params.append(cutoff)
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        
        with self.conn() as conn:
            rows = conn.execute(
                f"SELECT * FROM search_history {where_clause} ORDER BY created_at DESC LIMIT ?",
                params
            ).fetchall()
            
            result = []
            for row in rows:
                data = dict(row)
                if data.get('filters'):
                    try:
                        data['filters'] = json.loads(data['filters'])
                    except:
                        data['filters'] = {}
                result.append(data)
            
            return result
    
    def get_search_stats(self, days: int = 30) -> dict:
        """Get search statistics"""
        cutoff = int(datetime.now(timezone.utc).timestamp()) - (days * 86400)
        
        with self.conn() as conn:
            # Total searches
            total = conn.execute(
                "SELECT COUNT(*) FROM search_history WHERE created_at >= ?",
                (cutoff,)
            ).fetchone()[0]
            
            # Unique queries
            unique_queries = conn.execute(
                "SELECT COUNT(DISTINCT query) FROM search_history WHERE created_at >= ?",
                (cutoff,)
            ).fetchone()[0]
            
            # Top queries
            top_queries = conn.execute("""
                SELECT query, COUNT(*) as count
                FROM search_history
                WHERE created_at >= ?
                GROUP BY query
                ORDER BY count DESC
                LIMIT 10
            """, (cutoff,)).fetchall()
            
            # Average result count
            avg_results = conn.execute("""
                SELECT AVG(result_count) FROM search_history
                WHERE created_at >= ? AND result_count > 0
            """, (cutoff,)).fetchone()[0] or 0
            
            return {
                "total_searches": total,
                "unique_queries": unique_queries,
                "avg_result_count": round(avg_results, 1),
                "top_queries": [{"query": row[0], "count": row[1]} for row in top_queries],
                "days": days
            }
