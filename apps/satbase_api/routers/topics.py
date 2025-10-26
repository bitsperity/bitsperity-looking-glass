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

router = APIRouter()


@router.get("/news/topics/configured")
def get_configured_topics():
    """
    Get configured topics from control/topics.json.
    """
    s = load_settings()
    topics_file = Path(s.stage_dir).parent / "control" / "topics.json"
    
    try:
        if topics_file.exists():
            with open(topics_file, "r") as f:
                data = json.load(f)
                topics_list = data.get("topics", [])
        else:
            topics_list = []
        
        return {
            "topics": topics_list,
            "total": len(topics_list),
            "source": "configuration"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load configured topics: {str(e)}")


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
    granularity: str = Query("month", description="'month' or 'year'")
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
    granularity: str = Query("month", description="'month' or 'year'"),
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
    Add a new topic to the configured topics list.
    """
    s = load_settings()
    topic_name = body.get("symbol", "").strip().upper()
    
    if not topic_name:
        raise HTTPException(status_code=400, detail="Topic name (symbol) is required")
    
    # Load topics file
    topics_file = Path(s.stage_dir).parent / "control" / "topics.json"
    topics_file.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        if topics_file.exists():
            with open(topics_file, "r") as f:
                data = json.load(f)
                topics_list = data.get("topics", [])
        else:
            topics_list = []
            data = {"topics": topics_list}
        
        # Check if topic already exists
        if any(t.get("symbol") == topic_name for t in topics_list):
            raise HTTPException(status_code=409, detail=f"Topic '{topic_name}' already exists")
        
        # Add new topic
        today = date.today().isoformat()
        expires_at = body.get("expires_at", (date.today() + timedelta(days=365)).isoformat())
        
        new_topic = {
            "symbol": topic_name,
            "added_at": today,
            "expires_at": expires_at
        }
        
        topics_list.append(new_topic)
        
        # Save to file
        with open(topics_file, "w") as f:
            json.dump({"topics": topics_list}, f, indent=2)
        
        return {
            "success": True,
            "topic": new_topic,
            "total_topics": len(topics_list)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add topic: {str(e)}")


@router.delete("/news/topics/{topic_name}")
def delete_topic(topic_name: str):
    """
    Remove a topic from the configured topics list.
    """
    topic_name = topic_name.strip().upper()
    
    s = load_settings()
    topics_file = Path(s.stage_dir).parent / "control" / "topics.json"
    
    if not topics_file.exists():
        raise HTTPException(status_code=404, detail="Topics file not found")
    
    try:
        with open(topics_file, "r") as f:
            data = json.load(f)
            topics_list = data.get("topics", [])
        
        # Find and remove topic
        original_count = len(topics_list)
        topics_list = [t for t in topics_list if t.get("symbol") != topic_name]
        
        if len(topics_list) == original_count:
            raise HTTPException(status_code=404, detail=f"Topic '{topic_name}' not found")
        
        # Save to file
        with open(topics_file, "w") as f:
            json.dump({"topics": topics_list}, f, indent=2)
        
        return {
            "success": True,
            "topic_removed": topic_name,
            "remaining_count": len(topics_list)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete topic: {str(e)}")
