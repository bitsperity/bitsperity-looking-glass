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
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
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
                    body_text TEXT NOT NULL,
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
            """)
    
    def upsert_article(
        self,
        article: dict | Any,
        topics: list[str] | None = None,
        tickers: list[str] | None = None
    ) -> None:
        """
        Upsert article to database with topic/ticker merge.
        If article already exists by URL, merge topics and tickers.
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
        
        if not article_id or not url or not body_text:
            log("newsdb_upsert_invalid", article_id=article_id, url=url, has_body=bool(body_text))
            return
        
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
                INSERT OR REPLACE INTO news_articles
                (id, url, title, description, body_text, published_at, 
                 author, image, category, language, country, source_name, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                article_id,
                url,
                title,
                description,
                body_text,
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
            where_parts.append("(a.title LIKE ? OR a.description LIKE ? OR a.body_text LIKE ?)")
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
    
    def count_articles(
        self,
        from_date: str | date | None = None,
        to_date: str | date | None = None,
        topics: list[str] | None = None
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
