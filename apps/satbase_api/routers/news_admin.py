from datetime import datetime, timedelta, date
from pathlib import Path
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from libs.satbase_core.storage.news_db import NewsDB
from libs.satbase_core.config.settings import load_settings

router = APIRouter()


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


@router.post("/admin/topics/list")
def list_topics_configured():
    """List all configured topics (topics with articles)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    topics = db.get_all_topics()
    
    return {
        "topics": topics,
        "total_unique": len(topics),
        "total_articles": sum(t["count"] for t in topics)
    }


@router.delete("/admin/articles/batch")
def delete_articles_batch(
    topic: str | None = Query(None),
    before: str | None = Query(None, alias="before_date", description="YYYY-MM-DD"),
    article_ids: str | None = Query(None, description="Comma-separated IDs")
):
    """
    Delete articles by criteria.
    Options:
    - article_ids: Delete specific articles (CSV of IDs)
    - topic + before: Delete all articles with topic before date
    - topic: Delete all articles with this topic
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    deleted_count = 0
    
    if article_ids:
        # Delete specific articles
        ids = [id.strip() for id in article_ids.split(",") if id.strip()]
        deleted_count = db.delete_articles_batch(ids)
        
        # Log each deletion
        for article_id in ids:
            db.log_audit(
                action="deleted",
                article_id=article_id,
                details="manual_batch_delete"
            )
    
    elif topic:
        # Delete by topic
        before_date = None
        if before:
            try:
                before_date = date.fromisoformat(before)
            except ValueError:
                return JSONResponse(
                    {"error": f"Invalid date format: {before}. Use YYYY-MM-DD."},
                    status_code=400
                )
        deleted_count = db.delete_articles_by_topic(topic, before_date)
        
        # Log the batch operation
        db.log_audit(
            action="deleted_batch",
            topic=topic,
            details=f"topic_cleanup before_date={before_date}"
        )
    else:
        return JSONResponse(
            {"error": "Specify either article_ids or topic parameter"},
            status_code=400
        )
    
    return {
        "status": "success",
        "deleted_count": deleted_count,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/articles/duplicates")
def get_duplicate_articles():
    """Find potential duplicate articles (same URL)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    duplicates = db.get_duplicate_candidates()
    
    return {
        "total_duplicates": len(duplicates),
        "duplicates": duplicates,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/audit")
def get_audit_log(
    article_id: str | None = Query(None),
    action: str | None = Query(None, description="ingested, deleted, tagged_topic"),
    days: int | None = Query(None, ge=1, le=365),
    limit: int = Query(1000, ge=1, le=10000)
):
    """
    Get audit trail of all operations.
    Filter by article_id, action, or time period.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    logs = db.get_audit_log(
        article_id=article_id,
        action=action,
        days=days,
        limit=limit
    )
    
    return {
        "entries": logs,
        "total": len(logs),
        "filters": {
            "article_id": article_id,
            "action": action,
            "days": days,
            "limit": limit
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/audit/stats")
def get_audit_stats(days: int = Query(30, ge=1, le=365)):
    """Get audit statistics (action counts by type)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    stats = db.get_audit_stats(days=days)
    
    return {
        "stats": stats,
        "timestamp": datetime.utcnow().isoformat()
    }
