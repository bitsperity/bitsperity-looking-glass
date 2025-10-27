from datetime import date, datetime, timedelta
from pathlib import Path
from fastapi import APIRouter, Query, Body
from fastapi.responses import JSONResponse
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.news_db import NewsDB
import shutil

router = APIRouter()

@router.post("/news/reset")
def reset_all_data():
    """
    DANGEROUS: Delete all news data and reset SQLite database.
    Use this to clean corrupted data before fresh ingestion.
    """
    s = load_settings()
    stage_dir = Path(s.stage_dir)
    db_path = stage_dir.parent / "news.db"
    
    deleted = []
    errors = []
    
    # Delete SQLite database
    if db_path.exists():
        try:
            db_path.unlink()
            deleted.append("news.db")
        except Exception as e:
            errors.append(f"news.db: {str(e)}")
    
    # Delete old Parquet directories (for cleanup)
    for subdir in ["mediastack", "news_docs", "news_body", "gdelt", "rss"]:
        path = stage_dir / subdir
        if path.exists():
            try:
                shutil.rmtree(path, ignore_errors=True)
                deleted.append(subdir)
            except Exception as e:
                errors.append(f"{subdir}: {str(e)}")
    
    # Ensure stage dir exists
    stage_dir.mkdir(parents=True, exist_ok=True)
    stage_dir.parent.mkdir(parents=True, exist_ok=True)
    
    return {
        "status": "success" if not errors else "partial",
        "deleted_dirs": deleted,
        "errors": errors,
        "message": f"Deleted {len(deleted)} items. Database will be recreated on next ingest."
    }


@router.get("/news/health")
def news_health():
    """
    Health check for news ingestion pipeline.
    Returns: status, last ingestion, articles today, crawl success rate, staleness.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    # Get last ingestion time (most recent article)
    with db.conn() as conn:
        last_article = conn.execute(
            "SELECT MAX(fetched_at) FROM news_articles"
        ).fetchone()[0]
        
        # Count articles from today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = conn.execute(
            "SELECT COUNT(*) FROM news_articles WHERE fetched_at >= ?",
            (today_start,)
        ).fetchone()[0]
    
    # Calculate staleness
    if last_article:
        last_dt = datetime.fromisoformat(last_article) if isinstance(last_article, str) else last_article
        staleness_hours = (datetime.utcnow() - last_dt).total_seconds() / 3600
    else:
        staleness_hours = None
    
    # Get crawl success rate (last 24h)
    crawl_rate = db.get_crawl_success_rate(hours=24)
    
    # Determine status
    if not last_article:
        status = "no_data"
    elif staleness_hours > 24:
        status = "stale"
    elif today_count == 0:
        status = "idle"
    elif crawl_rate < 80:
        status = "degraded"
    else:
        status = "healthy"
    
    return {
        "status": status,
        "last_ingestion": last_article,
        "staleness_hours": round(staleness_hours, 1) if staleness_hours else None,
        "articles_today": today_count,
        "crawl_success_rate": crawl_rate,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/news/metrics")
def news_metrics():
    """
    Comprehensive data quality and coverage metrics.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    stats = db.get_coverage_stats()
    all_topics = db.get_all_topics()
    daily_counts = db.get_daily_counts(
        from_date=(datetime.utcnow().date() - timedelta(days=30)),
        to_date=datetime.utcnow().date()
    )
    duplicates = db.get_duplicate_candidates()
    crawl_rate = db.get_crawl_success_rate(hours=24)
    
    with db.conn() as conn:
        # Body length stats
        body_stats = conn.execute("""
            SELECT 
                COUNT(*) as total,
                ROUND(AVG(LENGTH(body_text)), 0) as avg_length,
                MIN(LENGTH(body_text)) as min_length,
                MAX(LENGTH(body_text)) as max_length
            FROM news_articles
            WHERE LENGTH(body_text) > 50
        """).fetchone()
        
        # Language breakdown
        langs = conn.execute("""
            SELECT language, COUNT(*) as count
            FROM news_articles
            WHERE language IS NOT NULL
            GROUP BY language
            ORDER BY count DESC
        """).fetchall()
        
        # Category breakdown
        cats = conn.execute("""
            SELECT category, COUNT(*) as count
            FROM news_articles
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
            LIMIT 10
        """).fetchall()
    
    return {
        "total_articles": stats["total"],
        "unique_articles": stats["total"] - len(duplicates),
        "duplicate_count": len(duplicates),
        "articles_per_topic": {t["name"]: t["count"] for t in all_topics},
        "crawl_success_rate_24h": crawl_rate,
        "body_text": {
            "avg_length": body_stats[1],
            "min_length": body_stats[2],
            "max_length": body_stats[3]
        },
        "date_range": {
            "from": stats["earliest"],
            "to": stats["latest"]
        },
        "languages": {lang[0]: lang[1] for lang in langs},
        "top_categories": {cat[0]: cat[1] for cat in cats},
        "coverage_24h": len([d for d in daily_counts if d["count"] > 0]) if daily_counts else 0,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/news/analytics")
def news_analytics(
    days: int = Query(30, ge=1, le=365),
    topics: str | None = Query(None, description="Comma-separated topic names")
):
    """
    Simple trend analysis: article counts over time with trend direction.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    from_date = (datetime.utcnow().date() - timedelta(days=days))
    to_date = datetime.utcnow().date()
    
    daily_counts = db.get_daily_counts(from_date=from_date, to_date=to_date)
    
    if not daily_counts:
        return {
            "period": {"from": from_date.isoformat(), "to": to_date.isoformat()},
            "daily_counts": [],
            "trend": "no_data"
        }
    
    # Calculate trend: compare first half vs second half
    mid = len(daily_counts) // 2
    first_half = sum(d["count"] for d in daily_counts[:mid]) if mid > 0 else 0
    second_half = sum(d["count"] for d in daily_counts[mid:]) if mid < len(daily_counts) else 0
    
    if first_half == 0:
        trend = "increasing"
    elif second_half == 0:
        trend = "decreasing"
    else:
        pct_change = ((second_half - first_half) / first_half) * 100
        if pct_change > 10:
            trend = "increasing"
        elif pct_change < -10:
            trend = "decreasing"
        else:
            trend = "stable"
    
    # Calculate moving average (7-day)
    moving_avg = []
    for i in range(len(daily_counts)):
        window = daily_counts[max(0, i-3):i+4]
        avg = sum(d["count"] for d in window) / len(window)
        moving_avg.append({"day": daily_counts[i]["day"], "avg": round(avg, 1)})
    
    return {
        "period": {"from": from_date.isoformat(), "to": to_date.isoformat()},
        "daily_counts": daily_counts,
        "moving_average_7d": moving_avg,
        "trend": trend,
        "total_articles": sum(d["count"] for d in daily_counts),
        "avg_per_day": round(sum(d["count"] for d in daily_counts) / len(daily_counts), 1) if daily_counts else 0,
        "max_day": max((d["count"] for d in daily_counts), default=0),
        "min_day": min((d["count"] for d in daily_counts), default=0)
    }


@router.get("/news/{article_id}")
def get_news_by_id(article_id: str):
    """Get a single news article by its ID"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    articles = db.get_articles_by_ids([article_id])
    
    if not articles:
        return JSONResponse({"error": "Article not found"}, status_code=404)
    
    return articles[0]

@router.get("/news")
def list_news(from_: str = Query(None, alias="from"), to: str | None = None, q: str | None = None, 
              tickers: str | None = None, limit: int = 100, offset: int = 0, 
              include_body: bool = False, has_body: bool = False):
    s = load_settings()
    if not from_ or not to:
        return {"items": [], "from": from_, "to": to, "limit": limit, "offset": offset, "total": 0}
    
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    # Get configured topics to check if q is a topic name
    try:
        from ..topics import get_configured_topics
        configured_topics = [t["name"] for t in get_configured_topics().get("topics", [])]
    except:
        configured_topics = []
    
    # Parse topic filter - only if q matches a configured topic
    topics_filter = None
    search_query = None
    
    if q:
        # Check if q (or any part of comma-separated q) is a configured topic
        q_parts = [t.strip() for t in q.split(',') if t.strip()]
        
        # If any part matches a topic (case-insensitive), use topic filtering with the correct case from configured_topics
        matching_topics = []
        for q_part in q_parts:
            for conf_topic in configured_topics:
                if q_part.lower() == conf_topic.lower():
                    matching_topics.append(conf_topic)  # Use the correctly-cased topic name
                    break
        
        if matching_topics:
            topics_filter = matching_topics
        else:
            # Otherwise treat as text search
            search_query = q
    
    # Parse ticker filter
    tickers_filter = None
    if tickers:
        tickers_filter = [t.strip().upper() for t in tickers.split(',') if t.strip()]
    
    # Query articles
    articles = db.query_articles(
        from_date=from_,
        to_date=to,
        search_query=search_query,
        topics=topics_filter,
        tickers=tickers_filter,
        has_body=has_body,
        limit=limit,
        offset=offset
    )
    
    # Remove body text if not requested
    if not include_body:
        for item in articles:
            item.pop("body_text", None)
    
    total = db.count_articles(from_date=from_, to_date=to, topics=topics_filter, search_query=search_query)
    
    return {
        "items": articles,
        "from": from_, 
        "to": to, 
        "limit": limit,
        "offset": offset,
        "total": total,
        "has_more": offset + limit < total,
        "include_body": include_body,
        "has_body": has_body
    }


@router.delete("/news/{news_id}")
def delete_news(news_id: str):
    """Delete a news article by ID"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    if db.delete_article(news_id):
            return {"success": True, "id": news_id, "message": "News article deleted"}
    else:
            return JSONResponse(
                {"success": False, "id": news_id, "message": "News article not found"},
                status_code=404
            )


@router.post("/news/bulk")
def bulk_get_news(body: dict):
    """
    Fetch multiple news articles by their IDs in one request.
    
    Request body:
    {
        "ids": ["id1", "id2", "id3", ...],
        "include_body": true  (optional, default: false)
    }
    
    Response:
    {
        "items": [article1, article2, ...],
        "count": 3,
        "found": 3,
        "missing": 0,
        "missing_ids": []
    }
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    ids = body.get("ids", [])
    include_body = body.get("include_body", False)
    
    if not ids:
        return {"items": [], "count": 0, "found": 0, "missing": 0, "missing_ids": []}
    
    if not isinstance(ids, list):
        return JSONResponse({"error": "ids must be a list"}, status_code=400)
    
    # Fetch articles by IDs
    articles = db.get_articles_by_ids(ids)
    
    # Remove body if not requested
    if not include_body:
        for item in articles:
            item.pop("body_text", None)
    
    found_ids = {article["id"] for article in articles}
    missing_ids = [id for id in ids if id not in found_ids]
    
    return {
        "items": articles,
        "count": len(articles),
        "found": len(articles),
        "missing": len(missing_ids),
        "missing_ids": missing_ids
    }


@router.get("/news/heatmap")
def news_heatmap(
    topics: str = Query(..., description="Comma-separated topic names"),
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    granularity: str = Query("month", description="'year' or 'month'"),
    format: str = Query("flat", description="'flat' or 'matrix'")
):
    """Generate heatmap of article counts by topic and time period."""
    s = load_settings()
    
    # Parse topics
    topic_list = [t.strip() for t in topics.split(',') if t.strip()]
    if not topic_list:
        return {"error": "No topics provided", "data": []}
    
    # Default date range
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    db = NewsDB(s.stage_dir.parent / "news.db")
    return db.get_heatmap(
        from_date=from_,
        to_date=to,
        topics=topic_list,
        granularity=granularity,
        format=format
    )


@router.get("/news/trending/tickers")
def trending_tickers(
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(50, ge=1, le=100),
    min_mentions: int = Query(1, ge=1)
):
    """Get trending tickers from recent news."""
    s = load_settings()
    
    now = datetime.utcnow()
    start = now - timedelta(hours=hours)
    from_date = start.date()
    to_date = now.date()
    
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    # Query all tickers in date range
    with db.conn() as conn:
        rows = conn.execute("""
            SELECT ticker, COUNT(DISTINCT article_id) as count
            FROM news_tickers
            WHERE article_id IN (
                SELECT id FROM news_articles
                WHERE published_at >= ? AND published_at < ?
            )
            GROUP BY ticker
            HAVING count >= ?
            ORDER BY count DESC
            LIMIT ?
        """, [start, now, min_mentions, limit]).fetchall()
        
        tickers = []
        for row in rows:
            ticker, count = row
            # Get sample headlines
            samples = conn.execute("""
                SELECT DISTINCT title FROM news_articles
                WHERE id IN (
                    SELECT article_id FROM news_tickers
                    WHERE ticker = ?
                )
                LIMIT 3
            """, [ticker]).fetchall()
            
            tickers.append({
                "ticker": ticker,
                "mentions": count,
                "articles": count,
                "sample_headlines": [s[0] for s in samples]
            })
    
    return {
        "period": {"from": start.isoformat(), "to": now.isoformat()},
        "tickers": tickers,
        "total_tickers": len(tickers),
        "method": "sqlite_query"
    }


@router.get("/news/gaps")
def get_news_gaps(
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    min_articles_per_day: int = Query(10)
):
    """Detect date gaps in news coverage."""
    s = load_settings()
    
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    # Query daily article counts
    with db.conn() as conn:
        rows = conn.execute("""
            SELECT DATE(published_at) as day, COUNT(*) as count
            FROM news_articles
            WHERE published_at >= ? AND published_at < ?
            GROUP BY day
            ORDER BY day
        """, [dfrom, dto]).fetchall()
        
        daily_counts = {row[0]: row[1] for row in rows}
    
    # Identify gaps
    gaps = []
    for day_str in sorted(daily_counts.keys()):
        count = daily_counts[day_str]
        if count < min_articles_per_day:
            gaps.append({
                "date": day_str,
                "article_count": count,
                "gap_severity": "critical" if count == 0 else "low"
            })
    
    # Coverage stats
    total_days = (dto - dfrom).days + 1
    covered_days = len(daily_counts)
    
    return {
        "period": {"from": from_, "to": to},
        "coverage": {
            "total_days": total_days,
            "covered_days": covered_days,
            "gap_days": len(gaps),
            "coverage_percent": round((covered_days / total_days * 100) if total_days > 0 else 0, 2)
        },
        "gaps": gaps,
        "min_articles_threshold": min_articles_per_day
    }


@router.get("/news/integrity-check")
def check_integrity():
    """Verify data integrity of SQLite database."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    try:
        stats = db.get_coverage_stats()
        
        return {
            "total_articles": stats["total"],
            "unique_topics": stats["unique_topics"],
            "unique_tickers": stats["unique_tickers"],
            "date_range": {
                "from": stats["earliest"],
                "to": stats["latest"]
            },
            "status": "OK" if stats["total"] > 0 else "EMPTY",
            "message": "SQLite database is healthy and queryable"
            }
    
    except Exception as e:
        return JSONResponse(
            {
                "error": str(e),
                "status": "ERROR",
                "message": "Failed to check database integrity"
            },
            status_code=500
        )

@router.post("/news/{article_id}/update-body")
def update_article_body(article_id: str, body_text: str = Body(..., embed=True)):
    """Queue article body update (executed by scheduler to avoid DB locks)."""
    s = load_settings()
    
    try:
        if not body_text or len(body_text.strip()) < 10:
            return JSONResponse(
                {
                    "error": "Body text too short (minimum 10 characters)",
                    "status": "FAILED"
                },
                status_code=400
            )
        
        # Queue the update to a file - scheduler will process it
        # This avoids DB locking issues when scheduler is running
        import json
        from datetime import datetime
        
        queue_file = s.stage_dir.parent / ".body_update_queue.jsonl"
        
        # Append to queue file (JSONL format - one JSON per line)
        with open(queue_file, "a") as f:
            f.write(json.dumps({
                "article_id": article_id,
                "body_text": body_text[:1000000],
                "timestamp": datetime.utcnow().isoformat()
            }) + "\n")
        
        return {
            "article_id": article_id,
            "body_length": len(body_text),
            "status": "QUEUED",
            "message": "Body update queued for processing by scheduler"
        }
    
    except Exception as e:
        return JSONResponse(
            {
                "error": str(e),
                "status": "ERROR"
            },
            status_code=500
        )

