"""
Topic analytics and management endpoints for Satbase.
Provides insights into topic coverage, frequency, and trends.
"""
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
import json
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.news_db import NewsDB
from libs.satbase_core.storage.watchlist_db import WatchlistDB

router = APIRouter()


def _get_watchlist_db() -> WatchlistDB:
    """Get watchlist database instance."""
    s = load_settings()
    return WatchlistDB(s.stage_dir.parent / "control.db")


@router.get("/news/topics/configured")
def get_configured_topics():
    """
    Get configured topics from watchlist (type='topic').
    Replaces old control/topics.json approach.
    """
    db = _get_watchlist_db()
    items = db.list_items(item_type='topic', enabled=None, include_expired=False)
    
    # Transform to old format for backwards compatibility
    topics_list = []
    for item in items:
        topics_list.append({
            "symbol": item.get("key", ""),
            "added_at": item.get("added_at", ""),
            "expires_at": item.get("expires_at"),
            "id": item.get("id"),
            "label": item.get("label"),
            "enabled": bool(item.get("enabled", True))
        })
    
    return {
        "topics": topics_list,
        "total": len(topics_list),
        "source": "watchlist"
    }


@router.get("/news/topics/all")
def get_all_topics(from_: str = Query(None, alias="from"), to: str | None = None, limit: int = 100):
    """Get all topics mentioned in articles."""
    s = load_settings()
    db_path = s.stage_dir.parent / "news.db"
    
    # Determine date range
    if to:
        dto = date.fromisoformat(to)
    else:
        dto = date.today()
    
    if from_:
        dfrom = date.fromisoformat(from_)
    else:
        # No from_ provided - scan ALL available data
        dfrom = date(2020, 1, 1)
    
    if not db_path.exists():
        return {
            "period": {
                "from": from_ or "2020-01-01 (all data)",
                "to": to or date.today().isoformat(),
                "limited_to": limit if limit else "all"
            },
            "topics": [],
            "total_unique_topics": 0,
            "total_articles_with_topics": 0
        }
    
    db = NewsDB(db_path)
    topics_list = db.get_all_topics(from_date=dfrom, to_date=dto, limit=limit)
    
    return {
        "period": {
            "from": from_ or "2020-01-01 (all data)",
            "to": to or date.today().isoformat(),
            "limited_to": limit if limit else f"{len(topics_list)} (all)"
        },
        "topics": topics_list,
        "total_unique_topics": len(topics_list),
        "total_articles_with_topics": sum(t["count"] for t in topics_list)
    }


@router.get("/news/topics/summary")
def get_topic_summary(limit: int = Query(10, ge=1, le=100), days: int = Query(30, ge=1, le=365)):
    """
    Get lightweight topics summary for dashboard/overview.
    """
    s = load_settings()
    
    # Calculate date range
    to = date.today().isoformat()
    from_ = (date.today() - timedelta(days=days)).isoformat()
    
    db_path = s.stage_dir.parent / "news.db"
    if not db_path.exists():
        return {
            "period": {"from": from_, "to": to, "days": days},
            "topics": [],
            "total_unique_topics": 0,
            "total_articles_with_topics": 0
        }
    
    db = NewsDB(db_path)
    topics_list = db.get_all_topics(from_date=from_, to_date=to, limit=limit)
    
    return {
        "period": {"from": from_, "to": to, "days": days},
        "topics": topics_list,
        "total_unique_topics": len(topics_list),
        "total_articles_with_topics": sum(t["count"] for t in topics_list)
    }


@router.get("/news/topics/stats")
def get_topic_stats(
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    granularity: str = Query("month", description="'day', 'month', or 'year'")
):
    """
    Get time-series counts of articles per topic.
    """
    s = load_settings()
    
    # Default to last 365 days
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    db_path = s.stage_dir.parent / "news.db"
    if not db_path.exists():
        return {
            "period": {"from": from_, "to": to},
            "granularity": granularity,
            "topics": [],
            "periods": [],
            "data": []
        }
    
    db = NewsDB(db_path)
    
    # Get heatmap data and transform for time-series format
    heatmap = db.get_heatmap(from_date=from_, to_date=to, topics=None, granularity=granularity, format="flat")
    
    return {
        "period": {"from": from_, "to": to},
        "granularity": granularity,
        "topics": heatmap.get("topics", []),
        "periods": heatmap.get("periods", []),
        "data": heatmap.get("data", [])
    }


@router.get("/news/topics/coverage")
def get_topic_coverage(
    topics: str = Query(..., description="Comma-separated topic names (e.g., 'AI,semiconductor')"),
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    granularity: str = Query("month", description="'day', 'month', or 'year'"),
    format: str = Query("flat", description="'flat' or 'matrix'")
):
    """
    Get heatmap-compatible topic coverage data.
    """
    s = load_settings()
    
    # Parse topics
    topic_list = [t.strip() for t in topics.split(',') if t.strip()]
    if not topic_list:
        return {"error": "No topics provided", "data": []}
    
    # Default to last 365 days
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    db_path = s.stage_dir.parent / "news.db"
    if not db_path.exists():
        return {
            "from": from_,
            "to": to,
            "granularity": granularity,
            "data": [] if format == "flat" else [],
            "topics": topic_list,
            "periods": [],
            "matrix": [] if format == "matrix" else None
        }
    
    db = NewsDB(db_path)
    return db.get_heatmap(from_date=from_, to_date=to, topics=topic_list, granularity=granularity, format=format)


@router.post("/news/topics/add")
def add_topic(body: dict[str, Any]):
    """
    Add a new topic to the watchlist (type='topic').
    Replaces old control/topics.json approach.
    """
    topic_name = body.get("symbol", "").strip().upper()
    
    if not topic_name:
        raise HTTPException(status_code=400, detail="Topic name (symbol) is required")
    
    db = _get_watchlist_db()
    
    # Check if topic already exists
    existing_items = db.list_items(item_type='topic', include_expired=True)
    if any(item.get("key") == topic_name for item in existing_items):
        raise HTTPException(status_code=409, detail=f"Topic '{topic_name}' already exists")
    
    # Prepare watchlist item
    expires_at = body.get("expires_at")
    if not expires_at:
        expires_at = (date.today() + timedelta(days=365)).isoformat()
    
    watchlist_item = {
        "type": "topic",
        "key": topic_name,
        "label": body.get("label", topic_name),
        "enabled": body.get("enabled", True),
        "auto_ingest": body.get("auto_ingest", True),
        "expires_at": expires_at
    }
    
    added = db.add_items([watchlist_item])
    
    if not added:
        raise HTTPException(status_code=500, detail="Failed to add topic to watchlist")
    
    added_item = added[0]
    
    return {
        "success": True,
        "topic": {
            "symbol": added_item.get("key", topic_name),
            "added_at": added_item.get("added_at", date.today().isoformat()),
            "expires_at": added_item.get("expires_at"),
            "id": added_item.get("id")
        },
        "total_topics": len(db.list_items(item_type='topic'))
    }


@router.delete("/news/topics/{topic_name}")
def delete_topic(topic_name: str):
    """
    Remove a topic from the watchlist (type='topic').
    Replaces old control/topics.json approach.
    """
    topic_name = topic_name.strip().upper()
    
    db = _get_watchlist_db()
    
    # Find topic by key
    items = db.list_items(item_type='topic', include_expired=True)
    topic_item = next((item for item in items if item.get("key") == topic_name), None)
    
    if not topic_item:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_name}' not found")
    
    # Delete via watchlist DB
    if db.delete_item(topic_item.get("id")):
        remaining_items = db.list_items(item_type='topic')
        return {
            "success": True,
            "topic_removed": topic_name,
            "remaining_count": len(remaining_items)
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to delete topic from watchlist")
