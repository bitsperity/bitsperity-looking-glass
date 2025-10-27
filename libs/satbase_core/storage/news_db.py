from __future__ import annotations

import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, date, timedelta
from typing import Optional, Any
import json

from ..utils.logging import log


class NewsDB:
    """SQLite-based news storage with WAL mode for high concurrency."""
    
    def __init__(self, db_path: Path):
        """Initialize database with schema if not exists."""
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        log("newsdb_init", path=str(db_path))
    
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
                CREATE TABLE IF NOT EXISTS news_articles (
                    id TEXT PRIMARY KEY,
                    url TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    description TEXT,
                    body_text TEXT,
                    body_available BOOLEAN DEFAULT 0,
                    published_at TIMESTAMP NOT NULL,
                    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    author TEXT,
                    image TEXT,
                    category TEXT,
                    language TEXT,
                    country TEXT,
                    source_name TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_published_at ON news_articles(published_at);
                CREATE INDEX IF NOT EXISTS idx_category ON news_articles(category);
                CREATE INDEX IF NOT EXISTS idx_language ON news_articles(language);
                CREATE INDEX IF NOT EXISTS idx_fetched_at ON news_articles(fetched_at);
                CREATE INDEX IF NOT EXISTS idx_body_available ON news_articles(body_available);
                
                CREATE TABLE IF NOT EXISTS news_topics (
                    article_id TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    PRIMARY KEY (article_id, topic),
                    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_news_topics_topic ON news_topics(topic);
                CREATE INDEX IF NOT EXISTS idx_news_topics_article ON news_topics(article_id);
                
                CREATE TABLE IF NOT EXISTS news_tickers (
                    article_id TEXT NOT NULL,
                    ticker TEXT NOT NULL,
                    PRIMARY KEY (article_id, ticker),
                    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_news_tickers_ticker ON news_tickers(ticker);
                CREATE INDEX IF NOT EXISTS idx_news_tickers_article ON news_tickers(article_id);
                
                CREATE TABLE IF NOT EXISTS news_audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    action TEXT NOT NULL,
                    article_id TEXT,
                    article_url TEXT,
                    topic TEXT,
                    details TEXT,
                    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE SET NULL
                );
                
                CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON news_audit_log(timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_audit_article ON news_audit_log(article_id);
                CREATE INDEX IF NOT EXISTS idx_audit_action ON news_audit_log(action);
                
                CREATE TABLE IF NOT EXISTS job_tracking (
                    job_id TEXT PRIMARY KEY,
                    job_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    
                    payload TEXT,
                    progress_total INTEGER,
                    progress_current INTEGER,
                    
                    result TEXT,
                    error TEXT,
                    error_count INTEGER DEFAULT 0,
                    
                    duration_seconds INTEGER,
                    items_processed INTEGER DEFAULT 0,
                    items_failed INTEGER DEFAULT 0
                );
                
                CREATE INDEX IF NOT EXISTS idx_job_status ON job_tracking(status);
                CREATE INDEX IF NOT EXISTS idx_job_type ON job_tracking(job_type);
                CREATE INDEX IF NOT EXISTS idx_job_created ON job_tracking(created_at DESC);
            """)

            # Backward-compatible schema upgrade: add no_body_crawl if missing
            try:
                cols = conn.execute("PRAGMA table_info('news_articles')").fetchall()
                col_names = {c[1] for c in cols}
                if 'no_body_crawl' not in col_names:
                    conn.execute("ALTER TABLE news_articles ADD COLUMN no_body_crawl BOOLEAN DEFAULT 0")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_no_body_crawl ON news_articles(no_body_crawl)")
            except Exception:
                pass
    
    def upsert_article(
        self,
        article: dict | Any,
        topics: list[str] | None = None,
        tickers: list[str] | None = None
    ) -> None:
        """
        Upsert article to database with topic/ticker merge.
        If article already exists by URL, merge topics and tickers.
        Allows articles without body_text (summary-only).
        """
        # Extract article data
        if hasattr(article, 'model_dump'):
            # Pydantic model
            data = article.model_dump()
        elif isinstance(article, dict):
            data = article
        else:
            raise ValueError(f"Invalid article type: {type(article)}")
        
        article_id = data.get("id")
        url = data.get("url")
        title = data.get("title", "")
        description = data.get("description")
        body_text = data.get("body_text", "")
        published_at = data.get("published_at")
        
        if not article_id or not url:
            log("newsdb_upsert_invalid", article_id=article_id, url=url)
            return
        
        # Set body_available flag
        body_available = bool(body_text and len(body_text.strip()) > 10)
        
        # Normalize datetime
        if isinstance(published_at, str):
            published_at = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        elif isinstance(published_at, datetime):
            pass
        else:
            published_at = datetime.utcnow()
        
        with self.conn() as conn:
            # Upsert article (INSERT OR REPLACE)
            conn.execute("""
                INSERT INTO news_articles
                (id, url, title, description, body_text, body_available, published_at, 
                 author, image, category, language, country, source_name, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    url=excluded.url,
                    title=excluded.title,
                    description=excluded.description,
                    body_text=excluded.body_text,
                    body_available=excluded.body_available,
                    published_at=excluded.published_at,
                    author=excluded.author,
                    image=excluded.image,
                    category=excluded.category,
                    language=excluded.language,
                    country=excluded.country,
                    source_name=excluded.source_name,
                    fetched_at=CURRENT_TIMESTAMP
            """, (
                article_id,
                url,
                title,
                description,
                body_text if body_text else None,
                1 if body_available else 0,
                published_at,
                data.get("author"),
                data.get("image"),
                data.get("category"),
                data.get("language"),
                data.get("country"),
                data.get("source_name")
            ))
            
            # Get existing topics for this article
            existing_topics = conn.execute(
                "SELECT topic FROM news_topics WHERE article_id = ?",
                (article_id,)
            ).fetchall()
            existing_topics_set = {row[0] for row in existing_topics}
            
            # Merge new topics with existing
            topics = topics or []
            all_topics = existing_topics_set.union(set(topics))
            
            # Delete old topics and insert merged ones
            conn.execute("DELETE FROM news_topics WHERE article_id = ?", (article_id,))
            for topic in all_topics:
                if topic:
                    conn.execute(
                        "INSERT OR IGNORE INTO news_topics (article_id, topic) VALUES (?, ?)",
                        (article_id, topic)
                    )
            
            # Merge tickers similarly
            existing_tickers = conn.execute(
                "SELECT ticker FROM news_tickers WHERE article_id = ?",
                (article_id,)
            ).fetchall()
            existing_tickers_set = {row[0] for row in existing_tickers}
            
            tickers = tickers or []
            all_tickers = existing_tickers_set.union(set(tickers))
            
            conn.execute("DELETE FROM news_tickers WHERE article_id = ?", (article_id,))
            for ticker in all_tickers:
                if ticker:
                    conn.execute(
                        "INSERT OR IGNORE INTO news_tickers (article_id, ticker) VALUES (?, ?)",
                        (article_id, ticker)
                    )
    
    def query_articles(
        self,
        from_date: str | date | None = None,
        to_date: str | date | None = None,
        search_query: str | None = None,
        topics: list[str] | None = None,
        tickers: list[str] | None = None,
        has_body: bool = False,
        limit: int = 100,
        offset: int = 0
    ) -> list[dict]:
        """Query articles with filters."""
        
        # Build WHERE clause
        where_parts = ["1=1"]
        params: list[Any] = []
        
        if from_date:
            if isinstance(from_date, str):
                from_date = datetime.fromisoformat(from_date)
            where_parts.append("a.published_at >= ?")
            params.append(from_date)
        
        if to_date:
            if isinstance(to_date, str):
                to_date = datetime.fromisoformat(to_date)
            where_parts.append("a.published_at < ?")
            params.append(to_date)
        
        if has_body:
            where_parts.append("a.body_text IS NOT NULL AND LENGTH(a.body_text) > 0")
        
        if search_query:
            where_parts.append("(LOWER(a.title) LIKE LOWER(?) OR LOWER(a.description) LIKE LOWER(?) OR LOWER(a.body_text) LIKE LOWER(?))")
            search_term = f"%{search_query}%"
            params.extend([search_term, search_term, search_term])
        
        where_clause = " AND ".join(where_parts)
        
        # Build topic/ticker filter
        from_clause = "FROM news_articles a"
        if topics:
            from_clause += " JOIN news_topics nt ON a.id = nt.article_id"
            where_parts.append("nt.topic IN ({})".format(",".join("?" * len(topics))))
            params.extend(topics)
        elif tickers:
            from_clause += " JOIN news_tickers ntk ON a.id = ntk.article_id"
            where_parts.append("ntk.ticker IN ({})".format(",".join("?" * len(tickers))))
            params.extend(tickers)
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            rows = conn.execute(f"""
                SELECT DISTINCT
                    a.id, a.url, a.title, a.description, a.body_text,
                    a.published_at, a.fetched_at, a.author, a.image,
                    a.category, a.language, a.country, a.source_name
                {from_clause}
                WHERE {where_clause}
                ORDER BY a.published_at DESC
                LIMIT ? OFFSET ?
            """, params + [limit, offset]).fetchall()
            
            result = []
            for row in rows:
                article_dict = dict(row)
                
                # Fetch topics for this article
                topics_list = conn.execute(
                    "SELECT topic FROM news_topics WHERE article_id = ?",
                    (article_dict["id"],)
                ).fetchall()
                article_dict["topics"] = [t[0] for t in topics_list]
                
                # Fetch tickers for this article
                tickers_list = conn.execute(
                    "SELECT ticker FROM news_tickers WHERE article_id = ?",
                    (article_dict["id"],)
                ).fetchall()
                article_dict["tickers"] = [t[0] for t in tickers_list]
                
                result.append(article_dict)
            
            return result
    
    def get_articles_by_ids(self, ids: list[str]) -> list[dict]:
        """Fetch multiple articles by their IDs."""
        if not ids:
            return []
        
        with self.conn() as conn:
            # Create placeholders for SQL IN clause
            placeholders = ",".join("?" * len(ids))
            rows = conn.execute(f"""
                SELECT 
                    id, url, title, description, body_text,
                    published_at, fetched_at, author, image,
                    category, language, country, source_name
                FROM news_articles
                WHERE id IN ({placeholders})
                ORDER BY published_at DESC
            """, ids).fetchall()
            
            result = []
            for row in rows:
                article_dict = dict(row)
                
                # Fetch topics for this article
                topics_list = conn.execute(
                    "SELECT topic FROM news_topics WHERE article_id = ?",
                    (article_dict["id"],)
                ).fetchall()
                article_dict["topics"] = [t[0] for t in topics_list]
                
                # Fetch tickers for this article
                tickers_list = conn.execute(
                    "SELECT ticker FROM news_tickers WHERE article_id = ?",
                    (article_dict["id"],)
                ).fetchall()
                article_dict["tickers"] = [t[0] for t in tickers_list]
                
                result.append(article_dict)
            
            return result
    
    def count_articles(
        self,
        from_date: str | date | None = None,
        to_date: str | date | None = None,
        topics: list[str] | None = None,
        search_query: str | None = None
    ) -> int:
        """Count articles matching filters."""
        where_parts = ["1=1"]
        params: list[Any] = []
        
        if from_date:
            if isinstance(from_date, str):
                from_date = datetime.fromisoformat(from_date)
            where_parts.append("published_at >= ?")
            params.append(from_date)
        
        if to_date:
            if isinstance(to_date, str):
                to_date = datetime.fromisoformat(to_date)
            where_parts.append("published_at < ?")
            params.append(to_date)
        
        if search_query:
            where_parts.append("(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(body_text) LIKE LOWER(?))")
            search_term = f"%{search_query}%"
            params.extend([search_term, search_term, search_term])
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            if topics:
                count = conn.execute(f"""
                    SELECT COUNT(DISTINCT a.id)
                    FROM news_articles a
                    JOIN news_topics nt ON a.id = nt.article_id
                    WHERE {where_clause} AND nt.topic IN ({",".join("?" * len(topics))})
                """, params + topics).fetchone()[0]
            else:
                count = conn.execute(f"""
                    SELECT COUNT(*) FROM news_articles WHERE {where_clause}
                """, params).fetchone()[0]
            
            return count
    
    def delete_article(self, article_id: str) -> bool:
        """Delete article by ID."""
        with self.conn() as conn:
            result = conn.execute("DELETE FROM news_articles WHERE id = ?", (article_id,))
            return result.rowcount > 0

    def has_no_body_crawl(self, article_id: str) -> bool:
        """Check if article is tagged to skip future body crawling."""
        with self.conn() as conn:
            row = conn.execute("SELECT no_body_crawl FROM news_articles WHERE id = ?", (article_id,)).fetchone()
            return bool(row[0]) if row else False

    def tag_no_body_crawl(self, article_id: str, value: bool = True) -> None:
        """Set or unset the no_body_crawl flag for an article."""
        with self.conn() as conn:
            conn.execute("UPDATE news_articles SET no_body_crawl = ? WHERE id = ?", (1 if value else 0, article_id))

    def clear_body_and_tag(self, article_id: str, tag_skip: bool = True) -> bool:
        """Remove body_text, set body_available=0 and optionally tag to skip future crawling."""
        with self.conn() as conn:
            res = conn.execute(
                "UPDATE news_articles SET body_text = NULL, body_available = 0 WHERE id = ?",
                (article_id,)
            )
            if tag_skip:
                conn.execute("UPDATE news_articles SET no_body_crawl = 1 WHERE id = ?", (article_id,))
            return res.rowcount > 0
    
    def get_heatmap(
        self,
        from_date: str | date | None = None,
        to_date: str | date | None = None,
        topics: list[str] | None = None,
        granularity: str = "month",
        format: str = "flat"
    ) -> dict:
        """
        Get heatmap data: article counts by topic and time period.
        """
        if not topics:
            return {"data": [], "periods": [], "topics": []}
        
        # Parse dates
        if isinstance(from_date, str):
            from_date = datetime.fromisoformat(from_date)
        if isinstance(to_date, str):
            to_date = datetime.fromisoformat(to_date)
        
        # Determine period format
        if granularity == "year":
            period_format = "strftime('%Y', a.published_at)"
        else:  # month
            period_format = "strftime('%Y-%m', a.published_at)"
        
        with self.conn() as conn:
            rows = conn.execute(f"""
                SELECT
                    {period_format} as period,
                    nt.topic,
                    COUNT(DISTINCT a.id) as count
                FROM news_articles a
                JOIN news_topics nt ON a.id = nt.article_id
                WHERE a.published_at >= ? AND a.published_at < ?
                  AND nt.topic IN ({",".join("?" * len(topics))})
                GROUP BY period, nt.topic
                ORDER BY period, nt.topic
            """, [from_date, to_date] + topics).fetchall()
            
            # Collect periods and build data
            periods_set = set()
            data_list = []
            
            for row in rows:
                period, topic, count = row
                periods_set.add(period)
                data_list.append({"period": period, "topic": topic, "count": count})
            
            periods = sorted(list(periods_set))
            
            if format == "matrix":
                # Build matrix: rows are periods, columns are topics
                matrix = []
                for period in periods:
                    row = []
                    for topic in topics:
                        count = next(
                            (d["count"] for d in data_list if d["period"] == period and d["topic"] == topic),
                            0
                        )
                        row.append(count)
                    matrix.append(row)
                
                return {
                    "from": str(from_date),
                    "to": str(to_date),
                    "granularity": granularity,
                    "topics": topics,
                    "periods": periods,
                    "matrix": matrix
                }
            else:
                # Flat format
                return {
                    "from": str(from_date),
                    "to": str(to_date),
                    "granularity": granularity,
                    "data": data_list,
                    "topics": topics,
                    "periods": periods
                }
    
    def get_coverage_stats(self) -> dict:
        """Get coverage statistics for status endpoint."""
        with self.conn() as conn:
            # Total articles
            total = conn.execute("SELECT COUNT(*) FROM news_articles").fetchone()[0]
            
            # Date range
            date_range = conn.execute("""
                SELECT MIN(published_at), MAX(published_at) FROM news_articles
            """).fetchone()
            
            earliest = date_range[0] if date_range[0] else None
            latest = date_range[1] if date_range[1] else None
            
            # Unique tickers
            unique_tickers = conn.execute(
                "SELECT COUNT(DISTINCT ticker) FROM news_tickers"
            ).fetchone()[0]
            
            # Unique topics
            unique_topics = conn.execute(
                "SELECT COUNT(DISTINCT topic) FROM news_topics"
            ).fetchone()[0]
            
            return {
                "total": total,
                "earliest": earliest,
                "latest": latest,
                "unique_tickers": unique_tickers,
                "unique_topics": unique_topics
            }
    
    def get_all_topics(
        self,
        from_date: str | date | None = None,
        to_date: str | date | None = None,
        limit: int | None = None
    ) -> list[dict]:
        """Get all topics mentioned in articles."""
        where_parts = ["1=1"]
        params: list[Any] = []
        
        if from_date:
            if isinstance(from_date, str):
                from_date = datetime.fromisoformat(from_date)
            where_parts.append("a.published_at >= ?")
            params.append(from_date)
        
        if to_date:
            if isinstance(to_date, str):
                to_date = datetime.fromisoformat(to_date)
            where_parts.append("a.published_at < ?")
            params.append(to_date)
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            query = f"""
                SELECT nt.topic, COUNT(DISTINCT a.id) as count
                FROM news_topics nt
                JOIN news_articles a ON nt.article_id = a.id
                WHERE {where_clause}
                GROUP BY nt.topic
                ORDER BY count DESC
            """
            
            if limit:
                query += f" LIMIT {limit}"
            
            rows = conn.execute(query, params).fetchall()
            
            return [{"name": row[0], "count": row[1]} for row in rows]
    
    def get_daily_counts(
        self,
        from_date: str | date | None = None,
        to_date: str | date | None = None
    ) -> list[dict]:
        """Get article counts by day for trend analysis."""
        where_parts = ["1=1"]
        params: list[Any] = []
        
        if from_date:
            if isinstance(from_date, str):
                from_date = datetime.fromisoformat(from_date)
            where_parts.append("published_at >= ?")
            params.append(from_date)
        
        if to_date:
            if isinstance(to_date, str):
                to_date = datetime.fromisoformat(to_date)
            where_parts.append("published_at < ?")
            params.append(to_date)
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            rows = conn.execute(f"""
                SELECT DATE(published_at) as day, COUNT(*) as count
                FROM news_articles
                WHERE {where_clause}
                GROUP BY day
                ORDER BY day
            """, params).fetchall()
            
            return [{"day": row[0], "count": row[1]} for row in rows]
    
    def get_ingestion_errors(self, hours: int = 24) -> list[dict]:
        """Get recent ingestion errors from job logs (placeholder)."""
        # This would normally come from a separate error log table
        # For now, return empty - can be extended with structured logging
        return []
    
    def get_crawl_success_rate(self, hours: int = 24) -> float:
        """Calculate body text crawl success rate."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        with self.conn() as conn:
            total = conn.execute(
                "SELECT COUNT(*) FROM news_articles WHERE fetched_at >= ?",
                (cutoff,)
            ).fetchone()[0]
            
            if total == 0:
                return 100.0
            
            with_body = conn.execute(
                "SELECT COUNT(*) FROM news_articles WHERE fetched_at >= ? AND LENGTH(body_text) > 50",
                (cutoff,)
            ).fetchone()[0]
            
            return round((with_body / total) * 100, 1)
    
    def get_duplicate_candidates(self) -> list[dict]:
        """Find potential duplicate articles (same URL)."""
        with self.conn() as conn:
            rows = conn.execute("""
                SELECT url, COUNT(*) as count, GROUP_CONCAT(id) as ids
                FROM news_articles
                GROUP BY url
                HAVING count > 1
            """).fetchall()
            
            return [
                {"url": row[0], "count": row[1], "article_ids": row[2].split(",")}
                for row in rows
            ]
    
    def delete_articles_batch(self, article_ids: list[str]) -> int:
        """Delete multiple articles by ID."""
        if not article_ids:
            return 0
        
        placeholders = ",".join("?" * len(article_ids))
        
        with self.conn() as conn:
            result = conn.execute(
                f"DELETE FROM news_articles WHERE id IN ({placeholders})",
                article_ids
            )
            return result.rowcount
    
    def delete_articles_by_topic(self, topic: str, before_date: str | date | None = None) -> int:
        """Delete all articles with a specific topic (optionally before a date)."""
        where_parts = ["nt.topic = ?"]
        params: list[Any] = [topic]
        
        if before_date:
            if isinstance(before_date, str):
                before_date = datetime.fromisoformat(before_date)
            where_parts.append("a.published_at < ?")
            params.append(before_date)
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            # Find article IDs to delete
            ids = conn.execute(f"""
                SELECT DISTINCT a.id
                FROM news_articles a
                JOIN news_topics nt ON a.id = nt.article_id
                WHERE {where_clause}
            """, params).fetchall()
            
            if not ids:
                return 0
            
            article_ids = [row[0] for row in ids]
            return self.delete_articles_batch(article_ids)
    
    def log_audit(
        self,
        action: str,
        article_id: str | None = None,
        article_url: str | None = None,
        topic: str | None = None,
        details: str | None = None
    ) -> None:
        """Log an action to audit trail."""
        with self.conn() as conn:
            conn.execute("""
                INSERT INTO news_audit_log 
                (action, article_id, article_url, topic, details)
                VALUES (?, ?, ?, ?, ?)
            """, (action, article_id, article_url, topic, details))
    
    def get_audit_log(
        self,
        article_id: str | None = None,
        action: str | None = None,
        days: int | None = None,
        limit: int = 1000
    ) -> list[dict]:
        """Query audit log with optional filters."""
        where_parts = ["1=1"]
        params: list[Any] = []
        
        if article_id:
            where_parts.append("article_id = ?")
            params.append(article_id)
        
        if action:
            where_parts.append("action = ?")
            params.append(action)
        
        if days:
            cutoff = datetime.utcnow() - timedelta(days=days)
            where_parts.append("timestamp >= ?")
            params.append(cutoff)
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            rows = conn.execute(f"""
                SELECT id, timestamp, action, article_id, article_url, topic, details
                FROM news_audit_log
                WHERE {where_clause}
                ORDER BY timestamp DESC
                LIMIT ?
            """, params + [limit]).fetchall()
            
            return [
                {
                    "id": row[0],
                    "timestamp": row[1],
                    "action": row[2],
                    "article_id": row[3],
                    "article_url": row[4],
                    "topic": row[5],
                    "details": row[6]
                }
                for row in rows
            ]
    
    def get_audit_stats(self, days: int = 30) -> dict:
        """Get audit statistics for operational reporting."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        with self.conn() as conn:
            # Action counts
            actions = conn.execute("""
                SELECT action, COUNT(*) as count
                FROM news_audit_log
                WHERE timestamp >= ?
                GROUP BY action
                ORDER BY count DESC
            """, (cutoff,)).fetchall()
            
            # Total entries
            total = conn.execute(
                "SELECT COUNT(*) FROM news_audit_log WHERE timestamp >= ?",
                (cutoff,)
            ).fetchone()[0]
            
            return {
                "period_days": days,
                "total_events": total,
                "actions": {action[0]: action[1] for action in actions}
            }
    
    def create_job(
        self,
        job_id: str,
        job_type: str,
        payload: dict | None = None
    ) -> None:
        """Create a new job record."""
        import json
        payload_str = json.dumps(payload) if payload else None
        
        with self.conn() as conn:
            conn.execute("""
                INSERT INTO job_tracking
                (job_id, job_type, status, payload)
                VALUES (?, ?, ?, ?)
            """, (job_id, job_type, "queued", payload_str))
    
    def update_job_status(
        self,
        job_id: str,
        status: str,
        started_at: datetime | None = None,
        completed_at: datetime | None = None
    ) -> None:
        """Update job status (queued, running, done, error)."""
        with self.conn() as conn:
            conn.execute("""
                UPDATE job_tracking
                SET status = ?, started_at = COALESCE(?, started_at), completed_at = ?
                WHERE job_id = ?
            """, (status, started_at, completed_at, job_id))
    
    def update_job_progress(
        self,
        job_id: str,
        current: int,
        total: int | None = None,
        items_processed: int | None = None,
        items_failed: int | None = None
    ) -> None:
        """Update job progress during execution."""
        with self.conn() as conn:
            conn.execute("""
                UPDATE job_tracking
                SET progress_current = ?,
                    progress_total = COALESCE(?, progress_total),
                    items_processed = COALESCE(?, items_processed),
                    items_failed = COALESCE(?, items_failed)
                WHERE job_id = ?
            """, (current, total, items_processed, items_failed, job_id))
    
    def complete_job(
        self,
        job_id: str,
        status: str = "done",
        result: dict | None = None,
        error: str | None = None
    ) -> None:
        """Mark job as completed with result or error."""
        import json
        result_str = json.dumps(result) if result else None
        
        with self.conn() as conn:
            started = conn.execute(
                "SELECT started_at FROM job_tracking WHERE job_id = ?",
                (job_id,)
            ).fetchone()
            
            duration = None
            if started and started[0]:
                start_dt = datetime.fromisoformat(started[0]) if isinstance(started[0], str) else started[0]
                duration = int((datetime.utcnow() - start_dt).total_seconds())
            
            conn.execute("""
                UPDATE job_tracking
                SET status = ?, result = ?, error = ?, 
                    completed_at = CURRENT_TIMESTAMP, duration_seconds = ?
                WHERE job_id = ?
            """, (status, result_str, error, duration, job_id))
    
    def get_job(self, job_id: str) -> dict | None:
        """Get detailed job information."""
        import json
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM job_tracking WHERE job_id = ?",
                (job_id,)
            ).fetchone()
            
            if not row:
                return None
            
            job = dict(row)
            if job["payload"]:
                job["payload"] = json.loads(job["payload"])
            if job["result"]:
                job["result"] = json.loads(job["result"])
            return job
    
    def list_jobs(
        self,
        status: str | None = None,
        job_type: str | None = None,
        limit: int = 100
    ) -> list[dict]:
        """List jobs with optional filters."""
        import json
        where_parts = ["1=1"]
        params: list[Any] = []
        
        if status:
            where_parts.append("status = ?")
            params.append(status)
        
        if job_type:
            where_parts.append("job_type = ?")
            params.append(job_type)
        
        where_clause = " AND ".join(where_parts)
        
        with self.conn() as conn:
            rows = conn.execute(f"""
                SELECT * FROM job_tracking
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ?
            """, params + [limit]).fetchall()
            
            jobs = []
            for row in rows:
                job = dict(row)
                if job["payload"]:
                    job["payload"] = json.loads(job["payload"])
                if job["result"]:
                    job["result"] = json.loads(job["result"])
                # Normalize field names for API
                job["kind"] = job.pop("job_type", None)
                jobs.append(job)
            
            return jobs
    
    def get_job_stats(self) -> dict:
        """Get job statistics."""
        with self.conn() as conn:
            stats = conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
                    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
                    ROUND(AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE NULL END), 1) as avg_duration_seconds,
                    SUM(CASE WHEN items_processed IS NOT NULL THEN items_processed ELSE 0 END) as total_items_processed
                FROM job_tracking
            """).fetchone()
            
            return {
                "total_jobs": stats[0] or 0,
                "queued": stats[1] or 0,
                "running": stats[2] or 0,
                "done": stats[3] or 0,
                "error": stats[4] or 0,
                "avg_duration_seconds": stats[5],
                "total_items_processed": stats[6] or 0,
                "success_rate": round(
                    (stats[3] or 0) / max(1, (stats[0] or 1)) * 100, 1
                )
            }
    
    def get_jobs(self, limit: int = 100, status_filter: str | None = None) -> list[dict]:
        """Get jobs from database - maps status_filter to status parameter."""
        return self.list_jobs(status=status_filter, limit=limit)
    
    def get_job_by_id(self, job_id: str) -> dict | None:
        """Get job by ID - alias for get_job."""
        return self.get_job(job_id)
    
    def delete_job(self, job_id: str) -> bool:
        """Mark job as cancelled/deleted."""
        try:
            with self.conn() as conn:
                conn.execute(
                    "UPDATE job_tracking SET status = ? WHERE job_id = ?",
                    ("cancelled", job_id)
                )
                return True
        except Exception as e:
            log("delete_job_error", job_id=job_id, error=str(e))
            return False
    
    def cleanup_stale_jobs(self) -> list[str]:
        """Clean up jobs stuck in 'running' state for more than 1 hour."""
        cleaned_job_ids = []
        try:
            with self.conn() as conn:
                # Find jobs stuck in running state for more than 1 hour
                one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()
                
                stuck_jobs = conn.execute("""
                    SELECT job_id, job_type, payload FROM job_tracking
                    WHERE status = 'running' 
                    AND started_at < ?
                    AND started_at IS NOT NULL
                """, (one_hour_ago,)).fetchall()
                
                for job_row in stuck_jobs:
                    job_id = job_row[0]
                    conn.execute(
                        "UPDATE job_tracking SET status = ?, error = ? WHERE job_id = ?",
                        ("timeout", "Job interrupted (likely server restart)", job_id)
                    )
                    cleaned_job_ids.append(job_id)
        except Exception as e:
            log("cleanup_stale_jobs_error", error=str(e))
        
        return cleaned_job_ids
